import fs from 'node:fs';
import path from 'node:path';

const projectRoot = process.cwd();
const pluginRoot = path.join(projectRoot, 'node_modules', '@capawesome', 'capacitor-google-sign-in');
const swiftImplPath = path.join(pluginRoot, 'ios', 'Plugin', 'GoogleSignIn.swift');
const swiftPluginPath = path.join(pluginRoot, 'ios', 'Plugin', 'GoogleSignInPlugin.swift');

function patchFile(filePath, patcher) {
  if (!fs.existsSync(filePath)) {
    console.log(`[native-google] Plugin dosyasi bulunamadi, atlandi: ${filePath}`);
    return;
  }

  const original = fs.readFileSync(filePath, 'utf8');
  const updated = patcher(original);

  if (updated !== original) {
    fs.writeFileSync(filePath, updated, 'utf8');
    console.log(`[native-google] Plugin yamasi uygulandi: ${path.basename(filePath)}`);
  }
}

patchFile(swiftImplPath, (source) => {
  let updatedSource = source;

  updatedSource = updatedSource.replace(
    'let configuration = GIDConfiguration(clientID: iosClientId, serverClientID: options.clientId)',
    `let serverClientId = options.clientId.trimmingCharacters(in: .whitespacesAndNewlines)
        let configuration: GIDConfiguration

        if serverClientId.isEmpty {
            configuration = GIDConfiguration(clientID: iosClientId)
        } else {
            configuration = GIDConfiguration(clientID: iosClientId, serverClientID: serverClientId)
        }`
  );

  if (updatedSource.includes('@objc public func getCurrentUser')) {
    return updatedSource;
  }

  const marker = '\n    @objc public func signOut(completion: @escaping (_ error: Error?) -> Void) {';
  const method = `
    @objc public func getCurrentUser(completion: @escaping (_ result: SignInResult?, _ error: Error?) -> Void) {
        guard let user = GIDSignIn.sharedInstance.currentUser else {
            completion(nil, CustomError.userIdMissing)
            return
        }

        guard let idToken = user.idToken?.tokenString else {
            completion(nil, CustomError.idTokenMissing)
            return
        }

        guard let userId = user.userID else {
            completion(nil, CustomError.userIdMissing)
            return
        }

        let signInResult = SignInResult(
            idToken: idToken,
            userId: userId,
            email: user.profile?.email,
            displayName: user.profile?.name,
            givenName: user.profile?.givenName,
            familyName: user.profile?.familyName,
            imageUrl: user.profile?.imageURL(withDimension: 0)?.absoluteString,
            accessToken: nil,
            serverAuthCode: nil
        )

        completion(signInResult, nil)
    }
`;

  if (!updatedSource.includes(marker)) {
    return updatedSource;
  }

  return updatedSource.replace(marker, `${method}${marker}`);
});

patchFile(swiftPluginPath, (source) => {
  let updated = source;

  if (!updated.includes('CAPPluginMethod(name: "getCurrentUser"')) {
    updated = updated.replace(
      'CAPPluginMethod(name: "signIn", returnType: CAPPluginReturnPromise),',
      'CAPPluginMethod(name: "signIn", returnType: CAPPluginReturnPromise),\n        CAPPluginMethod(name: "getCurrentUser", returnType: CAPPluginReturnPromise),'
    );
  }

  if (!updated.includes('@objc func getCurrentUser')) {
    const marker = '\n    @objc func signOut(_ call: CAPPluginCall) {';
    const method = `
    @objc func getCurrentUser(_ call: CAPPluginCall) {
        implementation?.getCurrentUser(completion: { result, error in
            if let error = error {
                self.rejectCall(call, error)
            } else {
                self.resolveCall(call, result)
            }
        })
    }
`;

    if (updated.includes(marker)) {
      updated = updated.replace(marker, `${method}${marker}`);
    }
  }

  return updated;
});

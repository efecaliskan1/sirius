import { Component } from 'react';

class AppErrorBoundary extends Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false };
    }

    static getDerivedStateFromError() {
        return { hasError: true };
    }

    componentDidCatch(error, info) {
        console.error('Unhandled app error', error, info);
    }

    handleReload = () => {
        if (typeof window !== 'undefined') {
            window.location.reload();
        }
    };

    handleGoHome = () => {
        if (typeof window !== 'undefined') {
            window.location.assign('/');
        }
    };

    render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen flex items-center justify-center bg-slate-950 px-6">
                    <div className="w-full max-w-lg rounded-3xl border border-white/10 bg-white/5 p-8 text-center text-white shadow-2xl backdrop-blur-xl">
                        <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-amber-400/15 text-3xl text-amber-300">
                            *
                        </div>
                        <h1 className="text-2xl font-bold tracking-tight">Sirius hit an unexpected issue</h1>
                        <p className="mt-3 text-sm leading-6 text-slate-300">
                            The page can be refreshed safely. Your saved study data is still kept in your account.
                        </p>
                        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
                            <button
                                type="button"
                                onClick={this.handleReload}
                                className="rounded-2xl bg-amber-400 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-amber-300"
                            >
                                Reload
                            </button>
                            <button
                                type="button"
                                onClick={this.handleGoHome}
                                className="rounded-2xl border border-white/15 bg-white/5 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
                            >
                                Return Home
                            </button>
                        </div>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

export default AppErrorBoundary;

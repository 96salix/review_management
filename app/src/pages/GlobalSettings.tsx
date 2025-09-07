import { useState, useEffect } from 'react';
import { addAuthHeader } from '../utils/api';
import { GlobalSettings } from '../types';

function GlobalSettingsPage() {
    const [settings, setSettings] = useState<GlobalSettings | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    useEffect(() => {
        const fetchSettings = async () => {
            try {
                const response = await fetch('/api/settings', addAuthHeader());
                if (!response.ok) {
                    throw new Error('設定の読み込みに失敗しました。');
                }
                const data = await response.json();
                setSettings(data);
            } catch (err) {
                setError(err instanceof Error ? err.message : '不明なエラーが発生しました。');
            } finally {
                setIsLoading(false);
            }
        };

        fetchSettings();
    }, []);

    const handleSave = async () => {
        if (!settings) return;

        try {
            const response = await fetch('/api/settings', addAuthHeader({
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(settings),
            }));

            if (!response.ok) {
                throw new Error('設定の保存に失敗しました。');
            }

            const data = await response.json();
            setSettings(data);
            setSuccessMessage('設定を保存しました。');
            setTimeout(() => setSuccessMessage(null), 3000);
        } catch (err) {
            setError(err instanceof Error ? err.message : '不明なエラーが発生しました。');
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setSettings(prev => prev ? { ...prev, [name]: name === 'defaultReviewerCount' ? parseInt(value, 10) : value } : null);
    };

    if (isLoading) {
        return <div>読み込み中...</div>;
    }

    if (error) {
        return <div style={{ color: 'red' }}>エラー: {error}</div>;
    }

    return (
        <div className="card">
            <h1>グローバル設定</h1>
            {successMessage && <div style={{ color: 'green', marginBottom: '1rem' }}>{successMessage}</div>}
            {settings && (
                <div>
                    <div style={{ marginBottom: '1rem' }}>
                        <label htmlFor="serviceDomain">サービスドメイン</label>
                        <input
                            type="text"
                            id="serviceDomain"
                            name="serviceDomain"
                            value={settings.serviceDomain}
                            onChange={handleChange}
                        />
                        <p style={{ fontSize: '0.8rem', color: '#666' }}>
                            Slack通知などで利用される、アプリケーションのURLを設定します。
                        </p>
                    </div>
                    <div style={{ marginBottom: '1rem' }}>
                        <label htmlFor="defaultReviewerCount">デフォルトのレビュアー数</label>
                        <input
                            type="number"
                            id="defaultReviewerCount"
                            name="defaultReviewerCount"
                            value={settings.defaultReviewerCount}
                            onChange={handleChange}
                        />
                        <p style={{ fontSize: '0.8rem', color: '#666' }}>
                            新規レビュー依頼でステージを追加する際の、デフォルトのレビュアー数を設定します。
                        </p>
                    </div>
                    <button onClick={handleSave}>設定を保存</button>
                </div>
            )}
        </div>
    );
}

export default GlobalSettingsPage;
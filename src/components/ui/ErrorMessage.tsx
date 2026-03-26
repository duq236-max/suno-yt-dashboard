interface ErrorMessageProps {
    error: string | null | undefined;
}

function extractMessage(error: string): string {
    try {
        const parsed: unknown = JSON.parse(error);
        if (
            parsed !== null &&
            typeof parsed === 'object' &&
            'message' in parsed &&
            typeof (parsed as Record<string, unknown>).message === 'string'
        ) {
            return (parsed as Record<string, string>).message;
        }
    } catch {
        // not JSON — return as-is
    }
    return error;
}

export default function ErrorMessage({ error }: ErrorMessageProps) {
    if (!error) return null;

    return (
        <div style={{
            backgroundColor: 'rgba(229, 62, 62, 0.12)',
            border: '1px solid rgba(229, 62, 62, 0.4)',
            borderRadius: '8px',
            padding: '12px 16px',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '8px',
            color: '#fc5050',
            fontSize: '0.875rem',
            lineHeight: '1.5',
        }}>
            <span aria-hidden="true">⚠️</span>
            <span>{extractMessage(error)}</span>
        </div>
    );
}

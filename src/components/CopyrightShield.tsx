'use client';

const RISK_KEYWORDS = [
    'Taylor Swift',
    'BTS',
    'BLACKPINK',
    'Beyoncé',
    'Beyonce',
    'Drake',
    'Ed Sheeran',
];

interface CopyrightShieldProps {
    text: string;
}

export default function CopyrightShield({ text }: CopyrightShieldProps) {
    const detected = RISK_KEYWORDS.filter(kw =>
        text.toLowerCase().includes(kw.toLowerCase())
    );

    if (detected.length === 0) return null;

    return (
        <div style={{
            padding: '10px 14px',
            marginBottom: '12px',
            background: 'rgba(234,179,8,0.1)',
            border: '1px solid rgba(234,179,8,0.4)',
            borderRadius: '8px',
            fontSize: '12px',
            color: '#fbbf24',
        }}>
            {detected.map(kw => (
                <div key={kw}>
                    ⚠️ <strong>{kw}</strong> 스타일 직접 언급은 저작권 위험
                </div>
            ))}
        </div>
    );
}

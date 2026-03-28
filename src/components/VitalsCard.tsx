import React from 'react'

interface VitalsCardProps {
    vitals: string
    title: string
    isBlurred?: boolean
}

const VitalsCard: React.FC<VitalsCardProps> = ({ vitals, title, isBlurred = false }) => {
    return (
        <div className={`vitals-card ${isBlurred ? 'vitals-card--blurred' : ''}`}>
            <h3 className="vitals-card__title">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{marginRight: '6px', verticalAlign: 'middle'}}>
                    <path d="M22 12H18L15 21L9 3L6 12H2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                {title}
            </h3>
            {isBlurred ? (
                <div className="vitals-card__blur-message">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M12 15V17M12 7V13M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    所見観察を完了して詳細を表示
                </div>
            ) : (
                <pre className="vitals-card__content">{vitals}</pre>
            )}
        </div>
    )
}

export default VitalsCard

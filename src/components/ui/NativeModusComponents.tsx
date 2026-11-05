import React from 'react';

interface ModusButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  color?: 'primary' | 'secondary' | 'danger' | 'warning' | 'tertiary' | string;
  buttonStyle?: 'filled' | 'outline' | 'borderless' | string;
  size?: 'small' | 'medium' | 'large' | string;
  children?: React.ReactNode;
}

export const ModusButton: React.FC<ModusButtonProps> = ({
  color = 'primary',
  buttonStyle = 'filled',
  size = 'medium',
  children,
  style,
  disabled,
  ...props
}) => {
  let bgColor = '#0063a3';
  let textColor = '#ffffff';
  let borderColor = '#0063a3';

  if (color === 'danger') {
    bgColor = '#dc3545';
    borderColor = '#dc3545';
  } else if (color === 'secondary') {
    bgColor = '#6c757d';
    borderColor = '#6c757d';
  } else if (color === 'warning') {
    bgColor = '#d97706';
    borderColor = '#d97706';
  }

  if (buttonStyle === 'outline') {
    textColor = bgColor;
    bgColor = 'transparent';
  } else if (buttonStyle === 'borderless') {
    textColor = bgColor;
    bgColor = 'transparent';
    borderColor = 'transparent';
  }

  let padding = '8px 14px';
  let fontSize = '13px';
  if (size === 'small') {
    padding = '4px 8px';
    fontSize = '11px';
  } else if (size === 'large') {
    padding = '12px 20px';
    fontSize = '15px';
  }

  return (
    <button
      disabled={disabled}
      style={{
        padding,
        fontSize,
        backgroundColor: disabled ? '#cbd5e1' : bgColor,
        color: disabled ? '#64748b' : textColor,
        border: `1px solid ${disabled ? '#cbd5e1' : borderColor}`,
        borderRadius: '4px',
        fontWeight: 'bold',
        cursor: disabled ? 'not-allowed' : 'pointer',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '6px',
        fontFamily: "'Segoe UI', Roboto, sans-serif",
        boxSizing: 'border-box',
        transition: 'all 0.15s ease-in-out',
        opacity: disabled ? 0.7 : 1,
        ...style
      }}
      {...props}
    >
      {children}
    </button>
  );
};

interface ModusAlertProps {
  type?: 'success' | 'error' | 'warning' | 'info' | string;
  message?: string;
  children?: React.ReactNode;
}

export const ModusAlert: React.FC<ModusAlertProps> = ({ type = 'info', message, children }) => {
  let bgColor = '#eef7ff';
  let borderColor = '#0063a3';
  let textColor = '#005288';
  let icon = 'ℹ️';

  if (type === 'success') {
    bgColor = '#e8f8f0';
    borderColor = '#28a745';
    textColor = '#155724';
    icon = '✅';
  } else if (type === 'error') {
    bgColor = '#fde8e8';
    borderColor = '#dc3545';
    textColor = '#721c24';
    icon = '❌';
  } else if (type === 'warning') {
    bgColor = '#fff8e6';
    borderColor = '#d97706';
    textColor = '#92400e';
    icon = '⚠️';
  }

  return (
    <div
      style={{
        padding: '10px 14px',
        backgroundColor: bgColor,
        borderLeft: `4px solid ${borderColor}`,
        borderRadius: '4px',
        color: textColor,
        fontSize: '12px',
        fontFamily: "'Segoe UI', Roboto, sans-serif",
        margin: '8px 0',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        wordBreak: 'break-word'
      }}
    >
      <span style={{ fontSize: '14px' }}>{icon}</span>
      <div style={{ flex: 1 }}>{message || children}</div>
    </div>
  );
};

interface ModusCardProps {
  children?: React.ReactNode;
  style?: React.CSSProperties;
}

export const ModusCard: React.FC<ModusCardProps> = ({ children, style }) => {
  return (
    <div
      style={{
        backgroundColor: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: '6px',
        padding: '16px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
        margin: '8px 0',
        ...style
      }}
    >
      {children}
    </div>
  );
};

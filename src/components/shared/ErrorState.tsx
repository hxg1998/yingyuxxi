'use client';

import { Result, Button } from '@arco-design/web-react';

interface ErrorStateProps {
  errorType: 'timeout' | 'api_error' | 'invalid_key' | 'network' | 'parse_error' | 'unknown';
  onRetry?: () => void;
}

// Map errorType to Arco Result status and user-facing title
const ERROR_MAP: Record<
  ErrorStateProps['errorType'],
  { status: '403' | '404' | '500' | 'error' | 'warning' | 'success'; title: string; retryable: boolean }
> = {
  timeout:     { status: '500', title: 'AI 思考超时，可能是模型比较忙，请稍后重试', retryable: true },
  api_error:   { status: '500', title: 'AI 服务暂时不可用，请稍后重试', retryable: true },
  invalid_key: { status: 'error', title: 'API Key 无效或已过期，请检查配置', retryable: false },
  network:     { status: 'warning', title: '网络连接中断，请检查网络后重试', retryable: true },
  parse_error: { status: '500', title: '生成内容格式异常，请重试', retryable: true },
  unknown:     { status: 'error', title: '出现了未知错误，请刷新页面重试', retryable: true },
};

/**
 * Inline error state — rendered below input, no page navigation.
 * Host app required: import '@arco-themes/react-abcd2/index.less'
 */
export default function ErrorState({ errorType, onRetry }: ErrorStateProps) {
  const config = ERROR_MAP[errorType] ?? ERROR_MAP.unknown;

  return (
    <div style={{ marginTop: 'var(--spacing-6)' }}>
      <Result
        status={config.status}
        title={config.title}
        extra={
          config.retryable && onRetry ? (
            <Button type="primary" onClick={onRetry}>
              稍后重试
            </Button>
          ) : undefined
        }
      />
    </div>
  );
}

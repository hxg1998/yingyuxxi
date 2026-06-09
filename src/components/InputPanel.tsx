'use client';

import { useState, useEffect } from 'react';
import { Input, Button, Typography } from '@arco-design/web-react';

interface InputPanelProps {
  onSubmit: (input: string) => void;
  isLoading?: boolean;
  initialValue?: string;
}

function validateInput(input: string): string | null {
  if (!input || input.trim().length === 0) return '请输入英文单词、短语或短句';
  if (input.length > 200) return '输入内容过长，请控制在 200 字以内';
  if (!/[a-zA-Z]/.test(input)) return '请输入英文内容（单词、短语或短句）';
  return null;
}

/**
 * Main input panel — textarea + submit button.
 * Sticks to the top of the viewport (frosted glass) while the result
 * cards scroll underneath. Handles front-end validation; delegates
 * submission to parent.
 * Host app required: import '@arco-themes/react-abcd2/index.less'
 */
export default function InputPanel({ onSubmit, isLoading, initialValue = '' }: InputPanelProps) {
  const [inputValue, setInputValue] = useState(initialValue);
  const [validationError, setValidationError] = useState<string | null>(null);

  // Sync external initialValue (e.g. from URL param)
  useEffect(() => {
    if (initialValue && initialValue !== inputValue) {
      setInputValue(initialValue);
    }
    // Only on mount / when initialValue changes externally
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialValue]);

  function handleSubmit() {
    const trimmed = inputValue.trim();
    const error = validateInput(trimmed);
    if (error) {
      setValidationError(error);
      return;
    }
    setValidationError(null);
    onSubmit(trimmed);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      handleSubmit();
    }
  }

  return (
    <div
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 10,
        background: 'var(--color-glass-bg)',
        backdropFilter: 'blur(var(--glass-blur))',
        WebkitBackdropFilter: 'blur(var(--glass-blur))',
        paddingTop: 'var(--spacing-4)',
        paddingBottom: 'var(--spacing-4)',
      }}
    >
      {/* Textarea */}
      <Input.TextArea
        value={inputValue}
        onChange={(value) => {
          setInputValue(value);
          if (validationError) setValidationError(null);
        }}
        onKeyDown={handleKeyDown}
        placeholder="输入英文单词、短语或短句..."
        autoSize={{ minRows: 3, maxRows: 6 }}
        maxLength={200}
        showWordLimit
        autoFocus
        disabled={isLoading}
        status={validationError ? 'error' : undefined}
        style={{ width: '100%' }}
      />

      {/* Inline validation error */}
      {validationError && (
        <Typography.Text
          style={{
            display: 'block',
            marginTop: 'var(--spacing-1)',
            fontSize: 'var(--font-size-caption, 12px)',
            color: 'var(--color-danger-6)',
          }}
        >
          {validationError}
        </Typography.Text>
      )}

      {/* Submit button */}
      <Button
        type="primary"
        size="large"
        long
        loading={isLoading}
        disabled={isLoading}
        onClick={handleSubmit}
        style={{ marginTop: 'var(--spacing-3)' }}
      >
        {isLoading ? '翻译中...' : '翻译'}
      </Button>
    </div>
  );
}

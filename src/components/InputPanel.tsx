'use client';

import { useState, useRef, useEffect } from 'react';
import { Input, Button, Space, Typography, Tag } from '@arco-design/web-react';

interface InputPanelProps {
  onSubmit: (input: string) => void;
  isLoading?: boolean;
  initialValue?: string;
}

const EXAMPLES = [
  { label: '单词',  text: 'alignment',                         labelColor: 'arcoblue' },
  { label: '单词',  text: 'onboarding',                        labelColor: 'arcoblue' },
  { label: '短语',  text: 'product-market fit',                labelColor: 'green'    },
  { label: '短语',  text: 'move the needle',                   labelColor: 'green'    },
  { label: '短句',  text: "Let's circle back on this.",        labelColor: 'orange'   },
  { label: '短句',  text: 'We need to align on priorities.',   labelColor: 'orange'   },
] as const;

function validateInput(input: string): string | null {
  if (!input || input.trim().length === 0) return '请输入英文单词、短语或短句';
  if (input.length > 200) return '输入内容过长，请控制在 200 字以内';
  if (!/[a-zA-Z]/.test(input)) return '请输入英文内容（单词、短语或短句）';
  return null;
}

/**
 * Main input panel — textarea + examples + submit button.
 * Handles front-end validation; delegates submission to parent.
 * Host app required: import '@arco-themes/react-abcd2/index.less'
 */
export default function InputPanel({ onSubmit, isLoading, initialValue = '' }: InputPanelProps) {
  const [inputValue, setInputValue] = useState(initialValue);
  const [validationError, setValidationError] = useState<string | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const textareaRef = useRef<any>(null);

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

  function handleExampleClick(text: string) {
    setInputValue(text);
    setValidationError(null);
    // Focus textarea
    if (textareaRef.current) {
      textareaRef.current.dom?.focus();
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      handleSubmit();
    }
  }

  return (
    <div>
      {/* Textarea */}
      <Input.TextArea
        ref={textareaRef}
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

      {/* Hint line */}
      <div style={{ marginTop: 'var(--spacing-8)' }}>
        <Typography.Text
          style={{
            fontSize: 'var(--font-size-body-3)',
            color: 'var(--color-text-3)',
          }}
        >
          试试这些 ↓
        </Typography.Text>
      </div>

      {/* Example hints */}
      <Space
        wrap
        size={[8, 8]}
        style={{ marginTop: 'var(--spacing-2)', width: '100%' }}
      >
        {EXAMPLES.map((ex) => (
          /* .example-hint and .example-hint-text classes enable hover feedback (#F2) */
          <span
            key={ex.text}
            className="example-hint"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--spacing-1)', cursor: 'pointer' }}
            onClick={() => handleExampleClick(ex.text)}
          >
            <Tag
              color={ex.labelColor as 'arcoblue' | 'green' | 'orange'}
              size="small"
              style={{ cursor: 'pointer' }}
            >
              {ex.label}
            </Tag>
            <Typography.Text
              className="example-hint-text"
              style={{
                fontSize: 'var(--font-size-body-3)',
                color: 'var(--color-text-2)',
                cursor: 'pointer',
                transition: 'color 150ms ease',
              }}
            >
              {ex.text}
            </Typography.Text>
          </span>
        ))}
      </Space>
    </div>
  );
}

import React, { useEffect, useState } from 'react';
import { TextInput, TextInputProps } from 'react-native';

const normalizeDigits = (value: string) => value
  .replace(/[۰-۹]/g, d => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d)))
  .replace(/[٬،]/g, ',');

export const parseFormattedNumber = (value: string): number => {
  const normalized = normalizeDigits(value).replace(/,/g, '').replace(/[^0-9.\-]/g, '');
  return Number(normalized) || 0;
};

export const formatInputNumber = (value: string, decimals = 0): string => {
  const normalized = normalizeDigits(value).replace(/,/g, '').replace(/[^0-9.\-]/g, '');
  if (!normalized) return '';
  const negative = normalized.startsWith('-');
  const raw = normalized.replace(/-/g, '');
  const parts = raw.split('.');
  const integer = parts[0] || '0';
  const grouped = integer.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  if (decimals > 0 && parts.length > 1) {
    return `${negative ? '-' : ''}${grouped}.${parts[1].slice(0, decimals)}`;
  }
  return `${negative ? '-' : ''}${grouped}`;
};

interface Props extends TextInputProps {
  decimals?: number;
}

export default function FormattedNumberInput({ decimals = 0, value, onChangeText, ...props }: Props) {
  const [display, setDisplay] = useState(() => formatInputNumber(String(value ?? ''), decimals));
  useEffect(() => setDisplay(formatInputNumber(String(value ?? ''), decimals)), [value, decimals]);
  return (
    <TextInput
      {...props}
      value={display}
      keyboardType={decimals > 0 ? 'decimal-pad' : 'number-pad'}
      onChangeText={(text) => {
        const formatted = formatInputNumber(text, decimals);
        setDisplay(formatted);
        onChangeText?.(formatted.replace(/,/g, ''));
      }}
    />
  );
}

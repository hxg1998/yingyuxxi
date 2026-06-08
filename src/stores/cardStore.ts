'use client';

import { create } from 'zustand';
import { CardData, CardError, InputType } from '@/types/card';

interface CardState {
  inputValue: string;
  inputType: InputType | null;
  cardData: CardData | null;
  isLoading: boolean;
  error: CardError | null;
}

interface CardActions {
  setInputValue: (value: string) => void;
  setInputType: (type: InputType) => void;
  setCardData: (data: CardData) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: CardError | null) => void;
  reset: () => void;
}

const initialState: CardState = {
  inputValue: '',
  inputType: null,
  cardData: null,
  isLoading: false,
  error: null,
};

export const useCardStore = create<CardState & CardActions>((set) => ({
  ...initialState,

  setInputValue: (value) => set({ inputValue: value }),
  setInputType: (type) => set({ inputType: type }),
  setCardData: (data) => set({ cardData: data }),
  setLoading: (loading) => set({ isLoading: loading }),
  setError: (error) => set({ error }),
  reset: () => set(initialState),
}));

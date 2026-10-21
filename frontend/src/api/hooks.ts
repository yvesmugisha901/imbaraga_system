import { useMutation, useQuery } from '@tanstack/react-query'
import { apiGet, apiPostText } from './client'
import type { District, Kpis, ScoreResponse } from '../types'

export const useKpis = () =>
  useQuery({ queryKey: ['kpis'], queryFn: () => apiGet<Kpis>('/kpis') })

export const useDistricts = () =>
  useQuery({ queryKey: ['districts'], queryFn: () => apiGet<District[]>('/districts') })

export const useScoreCsv = () =>
  useMutation({ mutationFn: (csv: string) => apiPostText<ScoreResponse>('/score', csv) })
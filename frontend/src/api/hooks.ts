import { useQuery } from '@tanstack/react-query'
import { apiGet } from './client'
import type { District, Kpis } from '../types'

export const useKpis = () =>
  useQuery({ queryKey: ['kpis'], queryFn: () => apiGet<Kpis>('/kpis') })

export const useDistricts = () =>
  useQuery({ queryKey: ['districts'], queryFn: () => apiGet<District[]>('/districts') })
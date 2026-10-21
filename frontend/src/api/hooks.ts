import { useMutation, useQuery } from '@tanstack/react-query'
import { apiGet, apiPostText } from './client'
import type { District, Kpis, ScoreResponse } from '../types'
import type { GeoCollection } from '../utils/geo'

export const useKpis = () =>
  useQuery({ queryKey: ['kpis'], queryFn: () => apiGet<Kpis>('/kpis') })

export const useDistricts = () =>
  useQuery({ queryKey: ['districts'], queryFn: () => apiGet<District[]>('/districts') })

export const useScoreCsv = () =>
  useMutation({ mutationFn: (csv: string) => apiPostText<ScoreResponse>('/score', csv) })

export const useGeoJson = () =>
  useQuery({
    queryKey: ['geo', 'districts'],
    staleTime: Infinity,
    queryFn: async (): Promise<GeoCollection> => {
      const res = await fetch('/rwanda_districts.geojson')
      if (!res.ok) throw new Error('rwanda_districts.geojson not found')
      const data = await res.json()
      if (data?.type !== 'FeatureCollection' || !Array.isArray(data.features)) throw new Error('Not a GeoJSON FeatureCollection')
      return data as GeoCollection
    },
  })
import { useState, useEffect } from 'react'
import { orionApi } from '@/integrations/orion/client'

export function useProjectData() {
  const [projects, setProjects] = useState<{ id: string; name: string }[]>([])
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(
    () => {
      const stored = localStorage.getItem('gapo_project_id')
      if (stored === 'undefined' || stored === 'null' || stored === '')
        return null
      return stored
    }
  )
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    let isMounted = true
    const fetchProjects = async () => {
      setIsLoading(true)
      try {
        const { data, error } = await orionApi
          .from('projects')
          .select('id, name')
          .order('name')

        if (!error && data && isMounted) {
          const sortedProjects = data as { id: string; name: string }[]
          setProjects(sortedProjects)

          if (!selectedProjectId && sortedProjects.length > 0) {
            setSelectedProjectId(sortedProjects[0].id)
          }
        }
      } finally {
        if (isMounted) setIsLoading(false)
      }
    }
    fetchProjects()
    return () => {
      isMounted = false
    }
  }, [selectedProjectId])

  const handleProjectSelect = (id: string) => {
    setSelectedProjectId(id)
    localStorage.setItem('gapo_project_id', id)
  }

  return {
    projects,
    selectedProjectId,
    handleProjectSelect,
    isLoading,
  }
}

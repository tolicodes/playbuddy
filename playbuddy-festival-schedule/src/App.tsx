import SchedulePage from './pages/SchedulePage/SchedulePage'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

const queryClient = new QueryClient()

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <SchedulePage />
    </QueryClientProvider>
  )
}

export default App

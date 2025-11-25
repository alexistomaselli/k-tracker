import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Navbar from '../components/layout/Navbar'
import Input from '../components/ui/Input'
import Button from '../components/ui/Button'
import Card, { CardContent, CardHeader } from '../components/ui/Card'
import { getSupabase, SUPABASE_CONFIGURED } from '../lib/supabase'

export default function ResetPassword() {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setMessage('')
    if (password !== confirm) {
      setError('Las contraseñas no coinciden')
      return
    }
    if (!SUPABASE_CONFIGURED) {
      setError('Función no disponible sin Supabase configurado')
      return
    }
    const supabase = getSupabase()!
    const { error } = await supabase.auth.updateUser({ password })
    if (error) {
      setError(error.message || 'No se pudo actualizar la contraseña')
      return
    }
    setMessage('Contraseña actualizada. Inicia sesión nuevamente.')
    setTimeout(() => navigate('/login'), 1200)
  }

  return (
    <div className="min-h-screen bg-[#F5F7FA] flex flex-col">
      <Navbar />
      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <Card className="w-full max-w-md">
          <CardHeader>
            <h1 className="text-2xl font-bold text-center text-gray-900">Restablecer Contraseña</h1>
            <p className="text-center text-gray-600 text-sm mt-2">Ingresa tu nueva contraseña</p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <Input label="Nueva contraseña" name="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
              <Input label="Confirmar contraseña" name="confirm" type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required />
              <Button type="submit" variant="primary" className="w-full mt-6">Actualizar</Button>
            </form>
            {message && <div className="mt-4 text-center text-sm text-green-600">{message}</div>}
            {error && <div className="mt-4 text-center text-sm text-red-600">{error}</div>}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
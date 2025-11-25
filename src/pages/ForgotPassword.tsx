import { useState } from 'react'
import Navbar from '../components/layout/Navbar'
import Input from '../components/ui/Input'
import Button from '../components/ui/Button'
import Card, { CardContent, CardHeader } from '../components/ui/Card'
import { getSupabase, SUPABASE_CONFIGURED } from '../lib/supabase'

export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setMessage('')
    if (!SUPABASE_CONFIGURED) {
      setMessage('Función no disponible sin Supabase configurado')
      return
    }
    const supabase = getSupabase()!
    const redirectTo = `${window.location.origin}/reset-password`
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo })
    if (error) {
      setError(error.message || 'No se pudo enviar el correo')
      return
    }
    setMessage('Revisa tu correo para restablecer la contraseña')
  }

  return (
    <div className="min-h-screen bg-[#F5F7FA] flex flex-col">
      <Navbar />
      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <Card className="w-full max-w-md">
          <CardHeader>
            <h1 className="text-2xl font-bold text-center text-gray-900">Recuperar Contraseña</h1>
            <p className="text-center text-gray-600 text-sm mt-2">Ingresa tu email para recibir el enlace</p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <Input label="Email" name="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
              <Button type="submit" variant="primary" className="w-full mt-6">Enviar enlace</Button>
            </form>
            {message && <div className="mt-4 text-center text-sm text-green-600">{message}</div>}
            {error && <div className="mt-4 text-center text-sm text-red-600">{error}</div>}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
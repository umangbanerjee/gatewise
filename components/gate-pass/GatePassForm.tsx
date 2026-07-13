'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { format } from 'date-fns'
import { CalendarIcon } from 'lucide-react'
import { toast } from 'sonner'
import { createGatePassSchema, type CreateGatePassInput } from '@/lib/schemas/gate-pass.schema'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/utils'
import type { GatePass } from '@/types'

interface GatePassFormProps {
  onCreated: (gatePass: GatePass) => void
}

export function GatePassForm({ onCreated }: GatePassFormProps) {
  const [exitDate, setExitDate] = useState<Date>()
  const [returnDate, setReturnDate] = useState<Date>()

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CreateGatePassInput>({
    resolver: zodResolver(createGatePassSchema),
    defaultValues: { declaration: undefined },
  })

  const declaration = watch('declaration')

  function buildDatetimeString(date: Date | undefined, timeStr: string): string {
    if (!date) return ''
    const [hours, minutes] = timeStr.split(':')
    const d = new Date(date)
    d.setHours(Number(hours) || 0, Number(minutes) || 0, 0, 0)
    return d.toISOString()
  }

  async function onSubmit(data: CreateGatePassInput) {
    try {
      const res = await fetch('/api/gate-passes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      const json = await res.json()
      if (!res.ok) {
        toast.error(json.error ?? 'Failed to create gate pass')
        return
      }
      toast.success('Gate pass request submitted!')
      reset()
      setExitDate(undefined)
      setReturnDate(undefined)
      onCreated(json)
    } catch {
      toast.error('Network error. Please try again.')
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      {/* Destination */}
      <div className="space-y-1">
        <Label htmlFor="to_location">Place to Go</Label>
        <Input
          id="to_location"
          placeholder="e.g. Cyber Hub, Gurugram"
          {...register('to_location')}
        />
        {errors.to_location && <p className="text-xs text-destructive">{errors.to_location.message}</p>}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Exit datetime */}
        <div className="space-y-1">
          <Label>Date &amp; Time of Exit</Label>
          <div className="flex gap-2">
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn('flex-1 justify-start text-left font-normal', !exitDate && 'text-muted-foreground')}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {exitDate ? format(exitDate, 'dd/MM/yyyy') : 'Pick date'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={exitDate}
                  onSelect={(d) => {
                    setExitDate(d)
                    const timeEl = document.getElementById('exit_time') as HTMLInputElement
                    const timeStr = timeEl?.value ?? '00:00'
                    if (d) setValue('exit_datetime', buildDatetimeString(d, timeStr))
                  }}
                  disabled={(d) => d < new Date(new Date().setHours(0, 0, 0, 0))}
                />
              </PopoverContent>
            </Popover>
            <Input
              id="exit_time"
              type="time"
              className="w-28"
              onChange={(e) => {
                if (exitDate) setValue('exit_datetime', buildDatetimeString(exitDate, e.target.value))
              }}
            />
          </div>
          {errors.exit_datetime && <p className="text-xs text-destructive">{errors.exit_datetime.message}</p>}
        </div>

        {/* Return datetime */}
        <div className="space-y-1">
          <Label>Date &amp; Time of Return</Label>
          <div className="flex gap-2">
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn('flex-1 justify-start text-left font-normal', !returnDate && 'text-muted-foreground')}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {returnDate ? format(returnDate, 'dd/MM/yyyy') : 'Pick date'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={returnDate}
                  onSelect={(d) => {
                    setReturnDate(d)
                    const timeEl = document.getElementById('return_time') as HTMLInputElement
                    const timeStr = timeEl?.value ?? '00:00'
                    if (d) setValue('return_datetime', buildDatetimeString(d, timeStr))
                  }}
                  disabled={(d) => d < new Date(new Date().setHours(0, 0, 0, 0))}
                />
              </PopoverContent>
            </Popover>
            <Input
              id="return_time"
              type="time"
              className="w-28"
              onChange={(e) => {
                if (returnDate) setValue('return_datetime', buildDatetimeString(returnDate, e.target.value))
              }}
            />
          </div>
          {errors.return_datetime && <p className="text-xs text-destructive">{errors.return_datetime.message}</p>}
        </div>
      </div>

      {/* Description */}
      <div className="space-y-1">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          placeholder="Brief reason for leaving campus…"
          rows={3}
          {...register('description')}
        />
        {errors.description && <p className="text-xs text-destructive">{errors.description.message}</p>}
      </div>

      {/* Declaration */}
      <div className="space-y-2">
        <div className="flex items-start gap-3">
          <Checkbox
            id="declaration"
            checked={!!declaration}
            onCheckedChange={(checked) => setValue('declaration', checked === true ? true : (undefined as any))}
          />
          <Label htmlFor="declaration" className="text-sm leading-relaxed cursor-pointer">
            I declare that all the information provided is accurate and I am solely responsible
            for my actions outside campus. I understand that any violations may result in
            disciplinary action by Starex University.
          </Label>
        </div>
        {errors.declaration && <p className="text-xs text-destructive">{errors.declaration.message}</p>}
      </div>

      <Button type="submit" className="w-full" disabled={isSubmitting}>
        {isSubmitting ? 'Submitting…' : 'Create Request'}
      </Button>
    </form>
  )
}

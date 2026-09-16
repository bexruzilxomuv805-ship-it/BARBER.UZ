import { useTranslation } from 'react-i18next'

const DEFAULT_RANGE = { boshlanish: '09:00', tugash: '18:00' }

// One row per weekday: a toggle for working/off, and start/end time
// inputs shown only while that day is a working day. `value` is a jadval
// object (see utils/schedule.js), `onChange` receives the whole updated
// object each time a row changes.
export default function WeeklyScheduleEditor({ value, onChange, weekdayOptions }) {
  const { t } = useTranslation()

  const setDay = (day, range) => {
    onChange({ ...value, [day]: range })
  }

  return (
    <div className="space-y-1.5">
      {weekdayOptions.map((d) => {
        const range = value?.[d.value]
        const working = !!range
        return (
          <div key={d.value} className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setDay(d.value, working ? null : DEFAULT_RANGE)}
              className={`w-24 shrink-0 rounded-lg border px-2.5 py-1.5 text-xs font-medium capitalize transition-colors ${
                working
                  ? 'border-gold-500/50 bg-gold-500/10 text-gold-400'
                  : 'border-ink-800 text-ink-500'
              }`}
            >
              {d.label}
            </button>
            {working ? (
              <>
                <input
                  type="time"
                  value={range.boshlanish}
                  onChange={(e) => setDay(d.value, { ...range, boshlanish: e.target.value })}
                  className="input-field !py-1.5 text-xs"
                />
                <span className="shrink-0 text-ink-600">—</span>
                <input
                  type="time"
                  value={range.tugash}
                  onChange={(e) => setDay(d.value, { ...range, tugash: e.target.value })}
                  className="input-field !py-1.5 text-xs"
                />
              </>
            ) : (
              <span className="text-xs text-ink-600">{t('admin.barbers.workingToggleOff')}</span>
            )}
          </div>
        )
      })}
    </div>
  )
}

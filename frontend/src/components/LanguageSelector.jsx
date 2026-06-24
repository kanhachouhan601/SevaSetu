import { useLanguage } from '../context/LanguageContext'

const options = [
  { value: 'en', labelKey: 'english' },
  { value: 'hi', labelKey: 'hindi' },
  { value: 'hinglish', labelKey: 'hinglish' },
]

export default function LanguageSelector({ compact = false }) {
  const { language, setLanguage, t } = useLanguage()

  return (
    <label className={`flex items-center gap-2 ${compact ? 'text-xs' : 'text-sm'} text-gray-600`}>
      <span className="hidden sm:inline">{t('language')}</span>
      <select
        value={language}
        onChange={event => setLanguage(event.target.value)}
        className="rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-xs font-semibold text-gray-700 outline-none transition focus:border-sky-300 focus:ring-2 focus:ring-sky-100"
      >
        {options.map(option => (
          <option key={option.value} value={option.value}>
            {t(option.labelKey)}
          </option>
        ))}
      </select>
    </label>
  )
}

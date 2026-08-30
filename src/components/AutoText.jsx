import useAutoTranslate from '../hooks/useAutoTranslate'

/**
 * Renders admin-entered free text, auto-translated into the active site
 * language. Use this instead of raw {value} wherever the content comes
 * from db.json (barber bios, service descriptions, addresses, reviews...)
 * rather than from the i18n dictionary.
 */
export default function AutoText({ text, as: Tag = 'span', ...rest }) {
  const translated = useAutoTranslate(text)
  return <Tag {...rest}>{translated}</Tag>
}

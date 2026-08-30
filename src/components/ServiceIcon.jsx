import { FaCut, FaChild, FaPalette, FaSpa, FaCrown, FaPenNib } from 'react-icons/fa'
import { GiBeard, GiRazor } from 'react-icons/gi'

const ICONS = {
  cut: FaCut,
  beard: GiBeard,
  combo: GiRazor,
  kids: FaChild,
  color: FaPalette,
  facial: FaSpa,
  design: FaPenNib,
  vip: FaCrown,
}

export default function ServiceIcon({ name, className = '' }) {
  const Icon = ICONS[name] || FaCut
  return <Icon className={className} />
}

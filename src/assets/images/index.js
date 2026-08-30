import heroArt from './hero-art.svg'
import barberAziz from './barber-aziz.svg'
import barberBekzod from './barber-bekzod.svg'
import barberJasur from './barber-jasur.svg'
import barberSardor from './barber-sardor.svg'

export const images = {
  hero: heroArt,
  'barber-aziz': barberAziz,
  'barber-bekzod': barberBekzod,
  'barber-jasur': barberJasur,
  'barber-sardor': barberSardor,
}

export function getBarberImage(key) {
  if (!key) return barberAziz
  if (key.startsWith('data:') || key.startsWith('http') || key.startsWith('blob:')) return key
  return images[key] || barberAziz
}

export default images

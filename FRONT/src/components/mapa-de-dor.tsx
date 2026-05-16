/** Reexport de compatibilidade — implementação em `MapaDeDor.tsx`. */
export { MapaDeDor, type MapaDeDorProps, type SelectedAreas } from "@/components/MapaDeDor"
export {
  type MapaDeDorEntrada,
  type MapaDeDorValor,
  type NivelDor,
  REGIOES_MAPA_DOR,
  TRADUCAO_PARTE_CORPO,
  nivelDaEntrada,
  normalizarMapaDeDorValor,
  migrarChavesLegadasMapaDor,
  labelParteCorpo,
  doresAtivasFromValor,
  doresCorpoFromValor,
} from "@/components/mapa-de-dor-model"

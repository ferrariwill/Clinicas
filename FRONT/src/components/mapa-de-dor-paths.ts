/**
 * Mapa de dor — modelo anatômico em SVG (frente e costas).
 * Espaço interno 0..100 × 0..290; o componente aplica scale(2, 400/290) → viewBox 0 0 200 400.
 * Regiões clicáveis: <path> com bordas finas; contorno de fundo não recebe clique.
 */

export const MAPA_DOR_VIEWBOX = "0 0 200 400"

/** Mapeia o modelo interno (100×290) para o viewBox final 200×400. */
export const MAPA_DOR_INNER_GROUP_TRANSFORM = "scale(2 1.3793103448275862)"

/** Contorno corporal suave (não clicável) + traços leves anatômicos. */
export const SILHUETA_FRENTE_DECOR = {
  contorno: `M50 17
    C32 17 22 30 24 46
    L26 56 L23 66 L20 77 L18 94 L17 116 L18 146 L20 176 L22 196 L24 216 L26 238 L28 256 L32 268 L39 275 L50 277 L61 275 L68 268 L72 256 L74 238 L76 216 L78 196 L80 176 L82 146 L83 116 L82 94 L80 77 L77 66 L74 56 L76 46
    C78 30 68 17 50 17Z`,
  detalhe1: `M38 54 Q50 60 62 54 M36 60 Q50 54 64 60`,
  detalhe2: `M40 86 Q50 92 60 86 M41 108 Q50 114 59 108`,
  detalhe3: `M44 128 Q50 134 56 128 M44 148 Q50 154 56 148`,
  detalhe4: `M42 178 Q50 186 58 178`,
  detalhe5: `M42 224 Q46 230 50 226 Q54 230 58 224`,
}

export const SILHUETA_COSTAS_DECOR = {
  contorno: `M50 17
    C32 17 22 30 24 46
    L26 56 L23 66 L20 77 L18 94 L17 116 L18 146 L20 176 L22 196 L24 216 L26 238 L28 256 L32 268 L39 275 L50 277 L61 275 L68 268 L72 256 L74 238 L76 216 L78 196 L80 176 L82 146 L83 116 L82 94 L80 77 L77 66 L74 56 L76 46
    C78 30 68 17 50 17Z`,
  detalhe1: `M36 52 Q50 46 64 52 M34 60 Q50 54 66 60`,
  detalhe2: `M50 64 L50 178 M47 78 Q50 82 53 78 M47 102 Q50 108 53 102 M47 132 Q50 138 53 132`,
  detalhe3: `M36 82 Q32 94 35 104 M64 82 Q68 94 65 104`,
  detalhe4: `M42 178 Q50 188 58 178`,
  detalhe5: `M42 224 Q46 230 50 226 Q54 230 58 224`,
}

/** Vista frontal — regiões clicáveis (coordenadas no espaço interno 100×290). */
export const PATHS_FRENTE: Record<string, string> = {
  frente_cabeca: `M50 20 C35 20 29 34 31 48 C33 60 42 65 50 65 C58 65 67 60 69 48 C71 34 65 20 50 20Z`,
  frente_pescoco: `M44 64 L56 64 L57 78 L43 78 Z`,
  frente_ombro_direito: `M31 76 L43 72 L45 86 L29 90 Z`,
  frente_ombro_esquerdo: `M69 76 L57 72 L55 86 L71 90 Z`,
  frente_braco_direito: `M27 88 L43 84 L41 124 L23 128 Z`,
  frente_braco_esquerdo: `M73 88 L57 84 L59 124 L77 128 Z`,
  frente_antebraco_direito: `M23 126 L41 122 L37 168 L19 172 Z`,
  frente_antebraco_esquerdo: `M77 126 L59 122 L63 168 L81 172 Z`,
  frente_mao_direita: `M17 170 L37 166 L33 194 L15 198 Z`,
  frente_mao_esquerda: `M83 170 L63 166 L67 194 L85 198 Z`,
  frente_torax: `M37 78 L63 78 L65 114 L35 114 Z`,
  frente_abdomen: `M35 112 L65 112 L63 148 L37 148 Z`,
  frente_quadril: `M37 146 L63 146 L61 174 L39 174 Z`,
  frente_coxa_direita: `M39 172 L50 170 L46 220 L37 222 Z`,
  frente_coxa_esquerda: `M61 172 L50 170 L54 220 L63 222 Z`,
  frente_joelho_direito: `M37 220 L45 218 L45 238 L35 240 Z`,
  frente_joelho_esquerdo: `M63 220 L55 218 L55 238 L65 240 Z`,
  frente_panturrilha_direita: `M35 238 L45 236 L43 274 L37 278 Z`,
  frente_panturrilha_esquerda: `M65 238 L55 236 L57 274 L63 278 Z`,
  frente_pe_direito: `M33 276 L43 272 L41 290 L35 292 Z`,
  frente_pe_esquerdo: `M67 276 L57 272 L59 290 L65 292 Z`,
}

/** Vista dorsal — coluna em três níveis (cervical, torácica, lombar). */
export const PATHS_COSTAS: Record<string, string> = {
  costas_cabeca: `M50 20 C35 20 29 34 31 48 C33 60 42 65 50 65 C58 65 67 60 69 48 C71 34 65 20 50 20Z`,
  costas_pescoco: `M44 64 L56 64 L57 78 L43 78 Z`,
  costas_ombro_direito: `M29 76 L42 72 L44 88 L27 92 Z`,
  costas_ombro_esquerdo: `M71 76 L58 72 L56 88 L73 92 Z`,
  costas_braco_direito: `M25 88 L42 84 L40 126 L21 130 Z`,
  costas_braco_esquerdo: `M75 88 L58 84 L60 126 L79 130 Z`,
  costas_antebraco_direito: `M21 128 L40 124 L36 170 L17 174 Z`,
  costas_antebraco_esquerdo: `M79 128 L60 124 L64 170 L83 174 Z`,
  costas_mao_direita: `M15 172 L37 168 L33 196 L13 200 Z`,
  costas_mao_esquerda: `M85 172 L63 168 L67 196 L87 200 Z`,
  costas_coluna_cervical: `M44 72 L56 72 L56 92 L44 92 Z`,
  costas_coluna_toracica: `M36 90 L64 90 L65 132 L35 132 Z`,
  costas_coluna_lombar: `M38 128 L62 128 L60 162 L40 162 Z`,
  costas_quadril: `M38 160 L62 160 L62 184 L38 184 Z`,
  costas_coxa_direita: `M40 182 L50 180 L46 230 L38 232 Z`,
  costas_coxa_esquerda: `M60 182 L50 180 L54 230 L62 232 Z`,
  costas_joelho_direito: `M38 230 L46 228 L46 248 L36 250 Z`,
  costas_joelho_esquerdo: `M62 230 L54 228 L54 248 L64 250 Z`,
  costas_panturrilha_direita: `M36 248 L46 246 L44 284 L38 288 Z`,
  costas_panturrilha_esquerda: `M64 248 L54 246 L56 284 L62 288 Z`,
  costas_pe_direito: `M34 286 L44 282 L42 290 L36 292 Z`,
  costas_pe_esquerdo: `M66 286 L56 282 L58 290 L64 292 Z`,
}

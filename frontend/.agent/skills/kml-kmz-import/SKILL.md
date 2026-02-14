---
name: kml-kmz-import
description: Importação e processamento de arquivos KML/KMZ contendo dados técnicos de torres e linhas de transmissão. Use para problemas com importação de dados geográficos.
---

# Skill: Importação de Dados KML/KMZ

Esta skill orienta a importação e processamento de arquivos KML/KMZ com dados técnicos.

## Quando usar esta skill

- Importar arquivos KML/KMZ de projetos de linhas de transmissão
- Diagnosticar erros na leitura de placemarks
- Extrair dados técnicos (altura, ângulo, elevação, coordenadas UTM)
- Converter entre formatos de coordenadas

## Arquivos principais

| Arquivo | Responsabilidade |
|---------|------------------|
| `src/components/map/kml-uploader.tsx` | Upload e parsing de KML/KMZ |
| `src/components/map/csv-uploader.tsx` | Upload alternativo via CSV |
| `src/types/kmz.ts` | Tipos TypeScript para KML |
| `src/hooks/useEnrichedPlacemarks.ts` | Enriquecimento de placemarks |

## Estrutura de dados esperada

### Campos obrigatórios no KML

```xml
<Placemark>
  <name>89/1A</name>
  <Point>
    <coordinates>-43.123456,-22.987654,0</coordinates>
  </Point>
  <ExtendedData>
    <Data name="object_height"><value>35.5</value></Data>
    <Data name="go_forward"><value>450</value></Data>
    <Data name="deflection"><value>74.38</value></Data>
    <Data name="object_elevation"><value>856.2</value></Data>
    <Data name="fuso_object"><value>23K</value></Data>
    <Data name="x_cord_object"><value>678901.234</value></Data>
    <Data name="y_cord_object"><value>7456789.012</value></Data>
  </ExtendedData>
</Placemark>
```

### Mapeamento de campos

| Campo Planilha (Aliases) | Campo Sistema | Descrição |
|-----------|---------------|-----------|
| `object_seq`, `seq`, `ordem` | `object_seq` | Sequência lógica (1, 2, 3...) - PRIORIDADE MÁXIMA |
| `tower_type`, `tipo`, `type` | `tower_type` | Tipo de estrutura/torre |
| `object_height`, `altura` | `object_height` | Altura da torre em metros |
| `fix_conductor`, `cabo_cond` | `fix_conductor` | Altura de fixação do cabo condutor |
| `go_forward`, `vao` | `go_forward` | Distância até próxima torre |
| `deflection`, `angulo` | `deflection` | Ângulo de deflexão/orientação |
| `object_elevation`, `cota` | `object_elevation` | Elevação do terreno |
| `x_coordinate`, `coord_x` | `x_coordinate` | Coordenada UTM X |
| `y_coordinate`, `coord_y` | `y_coordinate` | Coordenada UTM Y |

## Árvore de decisão

### Problema: Arquivo não carrega

1. Verificar extensão (.kml ou .kmz)
2. KMZ deve conter `doc.kml` dentro
3. Verificar encoding UTF-8

### Problema: Placemarks sem dados

1. Verificar se `<ExtendedData>` existe
2. Verificar nomes dos campos (case-sensitive)
3. Verificar se valores são numéricos válidos

### Problema: Sequência de torres (object_seq) errada
1. O backend ORION local gera IDs automáticos altos (8000+).
2. A planilha CSV/Excel é a **fonte da verdade** para sobrescrever esses números com a sequência real (1, 2, 3...).
3. Garanta que o `object_id` (nome da torre) na planilha coincida com o do banco para o `upsert` funcionar.

### Problema: Coordenadas não importam (Erro 400)
1. Verificar se `x_coordinate` e `y_coordinate` estão sendo enviados como números.
2. O Backend aceita tanto `x_coordinate` quanto `x_cord_object`.
3. Coordenadas muito grandes (> 180) são detectadas como UTM e exigem `fuso_object` (ex: 23S).

## Exemplo de parsing

```typescript
const parseKMLPlacemark = (placemark: Element): KMLPlacemark => {
    const name = placemark.querySelector('name')?.textContent || '';
    const coords = placemark.querySelector('coordinates')?.textContent?.split(',');
    
    const extendedData: Record<string, string> = {};
    placemark.querySelectorAll('ExtendedData Data').forEach(data => {
        const key = data.getAttribute('name');
        const value = data.querySelector('value')?.textContent;
        if (key && value) extendedData[key] = value;
    });
    
    return {
        name,
        type: 'point',
        coordinates: {
            lng: parseFloat(coords?.[0] || '0'),
            lat: parseFloat(coords?.[1] || '0'),
        },
        extendedData,
    };
};
```

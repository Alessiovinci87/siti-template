// Validatore minimale di JSON Schema (il sottoinsieme usato dai nostri template).
// Supporta: type, required, properties, additionalProperties: false, items,
// minItems, maxItems, minLength, maxLength, pattern, enum, anyOf, $ref a #/$defs.
// Gli errori sono in italiano, con il percorso del campo, così il problema
// si trova subito nel file dati del cliente.

function tipoDi(valore) {
  if (Array.isArray(valore)) return 'array';
  if (valore === null) return 'null';
  if (Number.isInteger(valore)) return 'integer';
  return typeof valore;
}

function tipoCompatibile(valore, tipoAtteso) {
  const tipi = Array.isArray(tipoAtteso) ? tipoAtteso : [tipoAtteso];
  const reale = tipoDi(valore);
  return tipi.some((t) => t === reale || (t === 'number' && reale === 'integer'));
}

function risolvi(schema, radice) {
  if (!schema.$ref) return schema;
  const percorso = schema.$ref.replace(/^#\//, '').split('/');
  return percorso.reduce((nodo, chiave) => nodo[chiave], radice);
}

function controlla(valore, schemaOriginale, radice, percorso, errori) {
  const schema = risolvi(schemaOriginale, radice);
  const dove = percorso || '(radice)';

  if (schema.anyOf) {
    const valido = schema.anyOf.some((alternativa) => {
      const prova = [];
      controlla(valore, alternativa, radice, percorso, prova);
      return prova.length === 0;
    });
    if (!valido) errori.push(`${dove}: valore non valido (${schema.description ?? 'formato non riconosciuto'})`);
    return;
  }

  if (schema.type && !tipoCompatibile(valore, schema.type)) {
    errori.push(`${dove}: atteso ${[].concat(schema.type).join(' o ')}, trovato ${tipoDi(valore)}`);
    return;
  }

  if (schema.enum && !schema.enum.includes(valore)) {
    errori.push(`${dove}: deve essere uno tra ${schema.enum.map((v) => `"${v}"`).join(', ')}`);
  }

  if (typeof valore === 'string') {
    if (schema.minLength != null && valore.trim().length < schema.minLength) {
      errori.push(`${dove}: campo vuoto o troppo corto (minimo ${schema.minLength} caratteri)`);
    }
    if (schema.maxLength != null && valore.length > schema.maxLength) {
      errori.push(`${dove}: troppo lungo (${valore.length} caratteri, massimo ${schema.maxLength})`);
    }
    if (schema.pattern && !new RegExp(schema.pattern).test(valore)) {
      errori.push(`${dove}: formato non valido${schema.description ? ` (${schema.description})` : ''}`);
    }
  }

  if (Array.isArray(valore)) {
    if (schema.minItems != null && valore.length < schema.minItems) {
      errori.push(`${dove}: servono almeno ${schema.minItems} elementi (ce ne sono ${valore.length})`);
    }
    if (schema.maxItems != null && valore.length > schema.maxItems) {
      errori.push(`${dove}: al massimo ${schema.maxItems} elementi (ce ne sono ${valore.length})`);
    }
    if (schema.items) {
      valore.forEach((elemento, i) => controlla(elemento, schema.items, radice, `${percorso}[${i}]`, errori));
    }
  }

  if (tipoDi(valore) === 'object') {
    for (const campo of schema.required ?? []) {
      if (valore[campo] === undefined || valore[campo] === null || valore[campo] === '') {
        errori.push(`${percorso ? `${percorso}.` : ''}${campo}: campo obbligatorio mancante`);
      }
    }
    const proprieta = schema.properties ?? {};
    for (const [campo, contenuto] of Object.entries(valore)) {
      const sotto = percorso ? `${percorso}.${campo}` : campo;
      if (campo === '$schema') continue;
      if (proprieta[campo]) {
        if (contenuto !== undefined && contenuto !== null) controlla(contenuto, proprieta[campo], radice, sotto, errori);
      } else if (schema.additionalProperties === false) {
        errori.push(`${sotto}: campo non previsto (refuso nel nome?)`);
      } else if (typeof schema.additionalProperties === 'object') {
        controlla(contenuto, schema.additionalProperties, radice, sotto, errori);
      }
    }
  }
}

/** Restituisce l'elenco degli errori (vuoto se i dati sono validi). */
export function valida(dati, schema) {
  const errori = [];
  controlla(dati, schema, schema, '', errori);
  return errori;
}

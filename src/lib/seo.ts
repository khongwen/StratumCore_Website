/**
 * Single source of truth for StratumCore structured data (JSON-LD).
 *
 * Every page builds its schema from these helpers so the entity description and
 * the founder's credentials are stated IDENTICALLY across the whole site.
 * Pages pass the resulting object to BaseLayout, which renders it once via
 * <script type="application/ld+json" set:html={JSON.stringify(schema)} />.
 */

export const SITE = 'https://www.stratumcore.com.au';

export const ORG_ID = `${SITE}/#organisation`;
export const FOUNDER_ID = `${SITE}/about/#wen-khong`;
export const COPRINCIPAL_ID = `${SITE}/about/#calvin-yong`;

/** The one description of what StratumCore is — used in schema AND visible copy. */
export const ENTITY_DESCRIPTION =
  'StratumCore is an independent finance advisory for mining, resources and asset-intensive businesses.';

/** Areas served — Queensland and Australia. */
export const AREA_SERVED = [
  { '@type': 'State', name: 'Queensland' },
  { '@type': 'Country', name: 'Australia' },
];

/** Service lines offered. */
export const SERVICE_TYPES = [
  'Mining finance consulting',
  'Financial control advisory',
  'Mining cost reduction',
  'Finance business partnering',
  'Finance team training',
];

/** Founder — Wen Khong, with credentials and sameAs profiles. */
export const founder = {
  '@type': 'Person',
  '@id': FOUNDER_ID,
  name: 'Wen Khong',
  jobTitle: 'Principal',
  worksFor: { '@id': ORG_ID },
  alumniOf: ['BHP', 'Wesfarmers', 'BUMA', 'Ernst & Young', 'Harvard Business School'],
  hasCredential: [
    {
      '@type': 'EducationalOccupationalCredential',
      credentialCategory: 'Professional certification',
      name: 'Chartered Accountant (CA ANZ)',
    },
    {
      '@type': 'EducationalOccupationalCredential',
      credentialCategory: 'Professional certification',
      name: 'Chartered Secretary (AGIA)',
    },
    {
      '@type': 'EducationalOccupationalCredential',
      credentialCategory: 'degree',
      name: 'Bachelor of Commerce (Professional Accounting and Finance)',
    },
    {
      '@type': 'EducationalOccupationalCredential',
      credentialCategory: 'Executive education',
      name: 'Harvard Business School alumnus',
    },
  ],
  sameAs: ['https://www.linkedin.com/in/wenkhong/'],
  url: `${SITE}/about`,
};

/** Co-principal — Calvin Yong. */
export const coPrincipal = {
  '@type': 'Person',
  '@id': COPRINCIPAL_ID,
  name: 'Calvin Yong',
  jobTitle: 'Principal',
  worksFor: { '@id': ORG_ID },
  alumniOf: ['BMA', 'BHP', 'Bankwest', 'CS Gas', 'The University of Queensland'],
  hasCredential: [
    {
      '@type': 'EducationalOccupationalCredential',
      credentialCategory: 'Professional certification',
      name: 'Certified Practising Accountant (CPA)',
    },
    {
      '@type': 'EducationalOccupationalCredential',
      credentialCategory: 'degree',
      name: 'MBA, The University of Queensland',
    },
  ],
  url: `${SITE}/about`,
};

/** The organisation / professional service entity. */
export const organization = {
  '@type': ['Organization', 'ProfessionalService'],
  '@id': ORG_ID,
  name: 'StratumCore',
  legalName: 'StratumCore Pty Ltd',
  description: ENTITY_DESCRIPTION,
  url: SITE,
  email: 'wen@stratumcore.com.au',
  telephone: '+61451954594',
  identifier: {
    '@type': 'PropertyValue',
    propertyID: 'ABN',
    value: '61 696 477 406',
  },
  areaServed: AREA_SERVED,
  serviceType: SERVICE_TYPES,
  founder: { '@id': FOUNDER_ID },
  sameAs: [
    'https://www.linkedin.com/company/stratumcore/',
    'https://www.linkedin.com/in/wenkhong/',
  ],
  address: {
    '@type': 'PostalAddress',
    addressLocality: 'Brisbane',
    addressRegion: 'QLD',
    addressCountry: 'AU',
  },
  knowsAbout: [
    'mining cost reduction',
    'cost per tonne benchmarking',
    'financial control and governance',
    'mining finance',
    'finance business partnering',
    'finance team training',
  ],
};

/** A breadcrumb trail. Pass [{ name, url }, ...]. */
export function breadcrumb(items: { name: string; url: string }[]) {
  return {
    '@type': 'BreadcrumbList',
    itemListElement: items.map((it, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: it.name,
      item: it.url,
    })),
  };
}

/** A single service offering, provided by the organisation. */
export function service(opts: {
  id: string;
  name: string;
  serviceType: string;
  description: string;
}) {
  return {
    '@type': 'Service',
    '@id': opts.id,
    name: opts.name,
    serviceType: opts.serviceType,
    provider: { '@id': ORG_ID },
    areaServed: AREA_SERVED,
    description: opts.description,
  };
}

/** An FAQPage built from a list of { q, a } pairs. */
export function faqPage(faqs: { q: string; a: string }[]) {
  return {
    '@type': 'FAQPage',
    mainEntity: faqs.map((f) => ({
      '@type': 'Question',
      name: f.q,
      acceptedAnswer: { '@type': 'Answer', text: f.a },
    })),
  };
}

/** Wrap one or more nodes in a schema.org @graph. Falsy nodes are dropped. */
export function graph(...nodes: any[]) {
  return {
    '@context': 'https://schema.org',
    '@graph': nodes.flat().filter(Boolean),
  };
}

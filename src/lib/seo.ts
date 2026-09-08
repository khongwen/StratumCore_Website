/**
 * Single source of truth for StratumCore structured data (JSON-LD).
 *
 * Every page builds its schema from these helpers so the entity description and
 * the principals' credentials are stated IDENTICALLY across the whole site.
 * Pages pass the resulting object to BaseLayout, which renders it once via
 * <script type="application/ld+json" set:html={JSON.stringify(schema)} />.
 *
 * Node @ids are stable and cross-referenced: the organisation is
 * <site>/#organization, each person is <site>/about/#<name>, each service is
 * <page>/#service. Anything referring to another node uses { '@id': ... }
 * rather than repeating it, so a fact is stated in exactly one place.
 */

export const SITE = 'https://www.stratumcore.com.au';

export const ORG_ID = `${SITE}/#organization`;
export const FOUNDER_ID = `${SITE}/about/#wen-khong`;
export const COPRINCIPAL_ID = `${SITE}/about/#calvin-yong`;

/** The one description of what StratumCore is — used in schema AND visible copy. */
export const ENTITY_DESCRIPTION =
  'Independent finance advisory firm in Brisbane providing cost reduction diagnostics, financial control and governance, and finance team development to mining operators, mining contractors and asset-intensive businesses across Queensland and Australia.';

/** Areas served — Queensland, the Northern Territory and Australia. */
export const AREA_SERVED = [
  { '@type': 'State', name: 'Queensland' },
  { '@type': 'State', name: 'Northern Territory' },
  { '@type': 'Country', name: 'Australia' },
];

/** Founder — Wen Khong, with credentials and sameAs profiles. */
export const founder = {
  '@type': 'Person',
  '@id': FOUNDER_ID,
  name: 'Wen Khong',
  jobTitle: 'Principal',
  worksFor: { '@id': ORG_ID },
  hasCredential: [
    {
      '@type': 'EducationalOccupationalCredential',
      name: 'Chartered Accountant (CA ANZ)',
    },
    {
      '@type': 'EducationalOccupationalCredential',
      name: 'Chartered Secretary (Governance Institute of Australia)',
    },
    {
      '@type': 'EducationalOccupationalCredential',
      name: 'Bachelor of Commerce, Professional Accounting and Finance',
    },
  ],
  alumniOf: [{ '@type': 'Organization', name: 'Harvard Business School' }],
  knowsAbout: [
    'Mining finance',
    'Cost reduction',
    'Financial control',
    'Commercial negotiation',
  ],
  sameAs: ['https://www.linkedin.com/in/wenkhong/'],
};

/**
 * Consulting principal — Calvin Yong, on selected engagements.
 *
 * `affiliation`, deliberately, not `worksFor` or the organisation's `employee`:
 * he is engaged on selected work, not employed by StratumCore Pty Ltd.
 */
export const coPrincipal = {
  '@type': 'Person',
  '@id': COPRINCIPAL_ID,
  name: 'Calvin Yong',
  jobTitle: 'Consulting Principal',
  affiliation: { '@id': ORG_ID },
  hasCredential: [
    {
      '@type': 'EducationalOccupationalCredential',
      name: 'Certified Practising Accountant (CPA)',
    },
    {
      '@type': 'EducationalOccupationalCredential',
      name: 'MBA, The University of Queensland',
    },
    {
      '@type': 'EducationalOccupationalCredential',
      name: 'Bachelor of Commerce, Accounting and Finance',
    },
  ],
  // TODO: Calvin's LinkedIn profile URL — add to sameAs once confirmed.
  // sameAs: ['https://www.linkedin.com/in/<calvin>/'],
};

/** The organisation / professional service entity. Emitted on every page. */
export const organization = {
  '@type': 'ProfessionalService',
  '@id': ORG_ID,
  name: 'StratumCore',
  legalName: 'StratumCore Pty Ltd',
  alternateName: 'StratumCore Pty Ltd',
  url: `${SITE}/`,
  logo: `${SITE}/brand_assets/stratumcore_logo.png`,
  description: ENTITY_DESCRIPTION,
  email: 'wen@stratumcore.com.au',
  address: {
    '@type': 'PostalAddress',
    addressLocality: 'Brisbane',
    addressRegion: 'QLD',
    addressCountry: 'AU',
  },
  areaServed: AREA_SERVED,
  knowsAbout: [
    'Mining cost reduction',
    'Unit cost benchmarking',
    'Open-cut mining operations',
    'Mining contractor finance',
    'Financial controls and governance',
    'Fractional financial controller',
    'Finance business partnering',
    'Finance leadership development',
  ],
  founder: { '@id': FOUNDER_ID },
  employee: [{ '@id': FOUNDER_ID }],
  sameAs: [
    'https://www.linkedin.com/company/stratumcore/',
    'https://abr.business.gov.au/ABN/View?abn=61696477406',
  ],
  identifier: {
    '@type': 'PropertyValue',
    propertyID: 'ABN',
    value: '61 696 477 406',
  },
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

/**
 * The page itself: what it is, when it last changed and who wrote it.
 * `dateModified` comes from the page's last git commit (see lib/gitdate.mjs),
 * so it moves only when the content actually moves.
 */
export function webPage(opts: {
  url: string;
  name: string;
  description: string;
  dateModified: string;
}) {
  return {
    '@type': 'WebPage',
    '@id': `${opts.url}#webpage`,
    url: opts.url,
    name: opts.name,
    description: opts.description,
    dateModified: opts.dateModified,
    author: { '@id': FOUNDER_ID },
    publisher: { '@id': ORG_ID },
    isPartOf: { '@type': 'WebSite', '@id': `${SITE}/#website`, url: `${SITE}/`, name: 'StratumCore' },
  };
}

/** Wrap one or more nodes in a schema.org @graph. Falsy nodes are dropped. */
export function graph(...nodes: any[]) {
  return {
    '@context': 'https://schema.org',
    '@graph': nodes.flat().filter(Boolean),
  };
}

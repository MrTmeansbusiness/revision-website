// Minimal question bank per section and topics
// Extend freely with real past-paper styled questions

const QUESTION_BANK = {
  s1: {
    topics: [
      { id: 'scarcity', name: 'Scarcity and choice' },
      { id: 'opportunity', name: 'Opportunity cost' },
    ],
    questions: [
      { topic: 'scarcity', text: 'Economics is primarily the study of how individuals and societies...', choices: ['Eliminate scarcity', 'Allocate scarce resources', 'Increase wants', 'Set prices only'], answer: 1 },
      { topic: 'opportunity', text: 'The opportunity cost of a choice is best defined as...', choices: ['Money spent', 'Next best alternative foregone', 'Total benefits gained', 'Time taken to decide'], answer: 1 },
    ],
  },
  s2: {
    topics: [
      { id: 'demand', name: 'Demand' },
      { id: 'supply', name: 'Supply' },
      { id: 'elasticity', name: 'Elasticity' },
    ],
    questions: [
      { topic: 'demand', text: 'A decrease in the price of a good ceteris paribus will...', choices: ['Decrease quantity demanded', 'Increase quantity demanded', 'Shift demand left', 'Shift demand right'], answer: 1 },
      { topic: 'supply', text: 'An improvement in technology will likely...', choices: ['Decrease supply', 'Increase supply', 'Increase demand', 'Lower equilibrium price only'], answer: 1 },
      { topic: 'elasticity', text: 'If PED > 1, demand is...', choices: ['Perfectly elastic', 'Elastic', 'Inelastic', 'Unitary'], answer: 1 },
    ],
  },
  s3: {
    topics: [
      { id: 'households', name: 'Households' },
      { id: 'firms', name: 'Firms' },
      { id: 'banks', name: 'Commercial banks' },
    ],
    questions: [
      { topic: 'households', text: 'Which is a primary role of households?', choices: ['Setting interest rates', 'Supplying labour', 'Issuing currency', 'Regulating markets'], answer: 1 },
      { topic: 'firms', text: 'Profit maximisation occurs when...', choices: ['MC = MR', 'AC = AR', 'Price = AVC', 'TR = TC only'], answer: 0 },
      { topic: 'banks', text: 'A function of commercial banks is to...', choices: ['Set fiscal policy', 'Provide loans and accept deposits', 'Print bank notes', 'Control inflation directly'], answer: 1 },
    ],
  },
  s4: {
    topics: [
      { id: 'gdp', name: 'GDP and growth' },
      { id: 'inflation', name: 'Inflation' },
      { id: 'unemployment', name: 'Unemployment' },
    ],
    questions: [
      { topic: 'gdp', text: 'Economic growth is typically measured by the change in...', choices: ['CPI', 'Unemployment rate', 'Real GDP', 'Budget deficit'], answer: 2 },
      { topic: 'inflation', text: 'Demand-pull inflation is caused by...', choices: ['Falling costs', 'Excess aggregate demand', 'Increased productivity', 'Lower money supply'], answer: 1 },
      { topic: 'unemployment', text: 'Frictional unemployment arises when...', choices: ['Workers change jobs', 'Economy is in recession', 'Wages are above equilibrium', 'Technology replaces labour'], answer: 0 },
    ],
  },
  s5: {
    topics: [
      { id: 'poverty', name: 'Poverty' },
      { id: 'sustain', name: 'Sustainability' },
    ],
    questions: [
      { topic: 'poverty', text: 'Absolute poverty is defined as...', choices: ['Income inequality', 'Inability to meet basic needs', 'Relative to median income', 'Temporary job loss'], answer: 1 },
      { topic: 'sustain', text: 'Sustainable development aims to...', choices: ['Maximise current consumption only', 'Meet present needs without compromising future generations', 'Eliminate economic growth', 'Prioritise profits over environment'], answer: 1 },
    ],
  },
  s6: {
    topics: [
      { id: 'trade', name: 'Benefits of trade' },
      { id: 'exchange', name: 'Exchange rates' },
    ],
    questions: [
      { topic: 'trade', text: 'Specialisation and trade allow countries to...', choices: ['Avoid opportunity cost', 'Consume beyond their PPF', 'Eliminate scarcity', 'Fix prices'], answer: 1 },
      { topic: 'exchange', text: 'A depreciation of a country’s currency tends to...', choices: ['Make exports more expensive', 'Make imports cheaper', 'Make exports cheaper', 'Have no effect on trade'], answer: 2 },
    ],
  },
};

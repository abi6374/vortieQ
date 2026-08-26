// Sub-topic taxonomy: what a learner "should know" at each level, per topic.
// Keyed by lowercased topic name. Falls back to a generic per-level phrasing
// for any topic not in the map, so unknown resume topics still render sensibly.

const LEVEL_KEYS = ['basic', 'intermediate', 'advanced', 'expert']

const TAXONOMY = {
  python: {
    basic: 'Syntax, variables, data types, loops, conditions, functions',
    intermediate: 'Modules, OOP, files, comprehensions, exceptions & error handling',
    advanced: 'REST APIs, unit testing, async/await, decorators, performance profiling',
    expert: 'System architecture, scaling, packaging, code review & mentoring',
  },
  sql: {
    basic: 'SELECT, WHERE, ORDER BY, basic joins, aggregate functions',
    intermediate: 'Multi-table joins, subqueries, GROUP BY, indexes, views',
    advanced: 'Window functions, CTEs, query optimization, transactions',
    expert: 'Schema design, sharding, replication, performance tuning at scale',
  },
  javascript: {
    basic: 'Variables, functions, arrays, objects, DOM basics',
    intermediate: 'Closures, promises, async/await, ES modules, fetch',
    advanced: 'Event loop, prototypes, generators, bundlers, testing',
    expert: 'Performance, memory, framework internals, architecture',
  },
  react: {
    basic: 'Components, props, state, JSX, event handling',
    intermediate: 'Hooks, effects, context, controlled forms, routing',
    advanced: 'Memoization, custom hooks, suspense, performance tuning',
    expert: 'State architecture, SSR, design systems, mentoring',
  },
  'node.js': {
    basic: 'Modules, npm, running scripts, basic HTTP',
    intermediate: 'Express, middleware, async I/O, environment config',
    advanced: 'Streams, clustering, auth, testing, error handling',
    expert: 'Scaling, microservices, observability, architecture',
  },
  docker: {
    basic: 'Images, containers, Dockerfile, run & build',
    intermediate: 'Volumes, networks, compose, multi-stage builds',
    advanced: 'Optimization, registries, healthchecks, CI integration',
    expert: 'Orchestration, security hardening, production ops',
  },
  kubernetes: {
    basic: 'Pods, deployments, services, kubectl basics',
    intermediate: 'ConfigMaps, secrets, ingress, scaling',
    advanced: 'Helm, operators, RBAC, resource tuning',
    expert: 'Cluster architecture, multi-tenancy, platform ops',
  },
  aws: {
    basic: 'EC2, S3, IAM basics, the console',
    intermediate: 'VPC, RDS, Lambda, CloudWatch, roles',
    advanced: 'Infrastructure as code, autoscaling, cost tuning',
    expert: 'Multi-account architecture, security, well-architected design',
  },
  'machine learning': {
    basic: 'Supervised vs unsupervised, train/test split, basic models',
    intermediate: 'Feature engineering, cross-validation, metrics, sklearn',
    advanced: 'Model tuning, pipelines, deployment, deep learning',
    expert: 'MLOps, scaling, research, novel architectures',
  },
  pandas: {
    basic: 'DataFrames, selection, filtering, basic aggregation',
    intermediate: 'GroupBy, merge/join, pivot, missing data',
    advanced: 'Vectorization, performance, time series, MultiIndex',
    expert: 'Large-scale pipelines, optimization, custom extensions',
  },
  'data analysis': {
    basic: 'Cleaning, summary stats, simple charts',
    intermediate: 'Exploratory analysis, correlation, segmentation',
    advanced: 'Statistical testing, forecasting, dashboards',
    expert: 'Experiment design, causal inference, analytics strategy',
  },
  git: {
    basic: 'Clone, commit, push, pull, branches',
    intermediate: 'Merge, rebase, conflict resolution, remotes',
    advanced: 'Interactive rebase, bisect, hooks, workflows',
    expert: 'Monorepo strategy, release management, team conventions',
  },
}

const GENERIC = (name) => ({
  basic: `Core syntax, fundamentals, and everyday usage of ${name}`,
  intermediate: `Common patterns, tooling, and real-project usage of ${name}`,
  advanced: `Advanced features, optimization, and production use of ${name}`,
  expert: `Architecture, scaling, and mentoring others in ${name}`,
})

export function subtopicsFor(topicName, level) {
  const key = (topicName || '').trim().toLowerCase()
  const entry = TAXONOMY[key] || GENERIC(topicName)
  return entry[level] || entry.basic
}

export { LEVEL_KEYS }

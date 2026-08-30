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
  typescript: {
    basic: 'Types, interfaces, basic generics, tsconfig',
    intermediate: 'Union types, type guards, utility types, enum patterns',
    advanced: 'Conditional types, mapped types, declaration merging, strict config',
    expert: 'Type-level programming, compiler API, monorepo type architecture',
  },
  html: {
    basic: 'Semantic elements, attributes, forms, document structure',
    intermediate: 'Accessibility (a11y), responsive media, meta tags, SEO basics',
    advanced: 'Web components, canvas, shadow DOM, performance optimization',
    expert: 'W3C standards, cross-platform architecture, rendering engine internals',
  },
  css: {
    basic: 'Selectors, box model, flexbox, colors, typography',
    intermediate: 'Grid, transitions, responsive design, media queries, variables',
    advanced: 'Keyframe animations, fluid typography, BEM, Tailwind/Sass, layout isolation',
    expert: 'CSS architecture at scale, Houdini, design token systems, render paint cost',
  },
  linux: {
    basic: 'File navigation, permissions, piping, grep, curl, basic shell commands',
    intermediate: 'Bash scripting, package managers, process management, cron jobs, SSH keys',
    advanced: 'Systemd, networking, memory profiling, iptables, kernel tuning',
    expert: 'Kernel compilation, security auditing, embedded/bare-metal systems',
  },
  postgresql: {
    basic: 'Table creation, CRUD operations, foreign keys, data types',
    intermediate: 'Indexes (B-tree, GIN), JSONB, constraints, complex joins, views',
    advanced: 'EXPLAIN ANALYZE, query planner tuning, VACUUM, partitioning, triggers',
    expert: 'High availability, replication, sharding, WAL archiving, scale tuning',
  },
  mongodb: {
    basic: 'Collections, documents, CRUD queries, basic operators',
    intermediate: 'Aggregation pipeline, indexing strategies, schema validation',
    advanced: 'Replica sets, transactions, change streams, performance profiling',
    expert: 'Cluster sharding, multi-region clusters, high-throughput optimization',
  },
  fastapi: {
    basic: 'Path operations, Pydantic request/response models, query params',
    intermediate: 'Dependency injection, JWT authentication, background tasks, CORS',
    advanced: 'Async database sessions, custom middleware, testing with pytest, OpenAPI',
    expert: 'High-concurrency architecture, microservice orchestration, scale profiling',
  },
  statistics: {
    basic: 'Mean, median, mode, standard deviation, normal distribution',
    intermediate: 'Hypothesis testing, p-values, confidence intervals, regression',
    advanced: 'Bayesian statistics, multivariate analysis, ANOVA, non-parametric tests',
    expert: 'Causal inference, stochastic processes, custom probabilistic models',
  },
  'deep learning': {
    basic: 'Neural network intuition, forward/backprop, activation functions',
    intermediate: 'CNNs, RNNs, transfer learning, regularization, PyTorch/TensorFlow',
    advanced: 'Transformers, attention mechanisms, embeddings, fine-tuning LLMs',
    expert: 'Custom model architectures, distributed training, model quantization, CUDA',
  },
  'product management': {
    basic: 'User stories, acceptance criteria, product backlog, sprint basics',
    intermediate: 'PRDs, user journey mapping, North Star metrics, competitor analysis',
    advanced: 'Product discovery, growth loops, A/B experiment design, go-to-market strategy',
    expert: 'Portfolio product strategy, org scaling, board-level stakeholder alignment',
  },
  'system design': {
    basic: 'Client-server architecture, caching basics, load balancers',
    intermediate: 'Microservices, message queues, rate limiting, SQL vs NoSQL trade-offs',
    advanced: 'CAP theorem, distributed caching, database sharding, consistency models',
    expert: 'Global scale multi-region architecture, disaster recovery, 99.999% availability',
  },
}

const GENERIC = (name) => ({
  basic: `Core syntax, fundamentals, and everyday usage of ${name}`,
  intermediate: `Common patterns, tooling, and real-project usage of ${name}`,
  advanced: `Advanced features, optimization, and production use of ${name}`,
  expert: `Architecture, scaling, and mentoring others in ${name}`,
})

export function extractSkillsFromText(text) {
  if (!text || typeof text !== 'string') return []
  const lower = text.toLowerCase()
  const detected = []

  const ALL_TOPICS = [
    { key: 'python', name: 'Python', aliases: ['python', 'py'] },
    { key: 'sql', name: 'SQL', aliases: ['sql', 'postgres', 'mysql', 'sqlite'] },
    { key: 'javascript', name: 'JavaScript', aliases: ['javascript', 'js', 'es6'] },
    { key: 'typescript', name: 'TypeScript', aliases: ['typescript', 'ts'] },
    { key: 'react', name: 'React', aliases: ['react', 'reactjs', 'nextjs', 'next.js'] },
    { key: 'fastapi', name: 'FastAPI', aliases: ['fastapi'] },
    { key: 'node.js', name: 'Node.js', aliases: ['node', 'nodejs', 'node.js', 'express'] },
    { key: 'pandas', name: 'Pandas', aliases: ['pandas'] },
    { key: 'machine learning', name: 'Machine Learning', aliases: ['machine learning', 'ml', 'scikit-learn', 'sklearn'] },
    { key: 'deep learning', name: 'Deep Learning', aliases: ['deep learning', 'pytorch', 'tensorflow', 'keras', 'neural'] },
    { key: 'data analysis', name: 'Data Analysis', aliases: ['data analysis', 'analytics', 'bi', 'tableau', 'power bi'] },
    { key: 'statistics', name: 'Statistics', aliases: ['statistics', 'statistical', 'probability'] },
    { key: 'docker', name: 'Docker', aliases: ['docker', 'containers', 'containerization'] },
    { key: 'kubernetes', name: 'Kubernetes', aliases: ['kubernetes', 'k8s'] },
    { key: 'aws', name: 'AWS', aliases: ['aws', 'cloud', 's3', 'ec2', 'lambda'] },
    { key: 'git', name: 'Git', aliases: ['git', 'github', 'version control'] },
    { key: 'html', name: 'HTML', aliases: ['html', 'html5'] },
    { key: 'css', name: 'CSS', aliases: ['css', 'css3', 'tailwind', 'sass'] },
    { key: 'linux', name: 'Linux', aliases: ['linux', 'bash', 'shell'] },
    { key: 'postgresql', name: 'PostgreSQL', aliases: ['postgresql', 'postgres'] },
    { key: 'mongodb', name: 'MongoDB', aliases: ['mongodb', 'nosql'] },
    { key: 'system design', name: 'System Design', aliases: ['system design', 'architecture', 'microservices'] },
    { key: 'product management', name: 'Product Management', aliases: ['product management', 'agile', 'scrum', 'prd'] },
  ]

  for (const item of ALL_TOPICS) {
    const matched = item.aliases.some((alias) => {
      const regex = new RegExp(`\\b${alias.replace('.', '\\.')}\\b`, 'i')
      return regex.test(lower)
    })

    if (matched) {
      let level = 'intermediate'
      let conf = 82
      if (/\b(beginner|learning|started|scratch|basic|intro)\b/i.test(lower)) {
        level = 'basic'
        conf = 72
      } else if (/\b(senior|expert|lead|architect|advanced|proficient|5\+? years)\b/i.test(lower)) {
        level = 'advanced'
        conf = 90
      }

      detected.push({
        name: item.name,
        suggested_level: level,
        confidence_pct: conf,
        evidence: `Mentioned in your background description`,
      })
    }
  }

  return detected
}

export function subtopicsFor(topicName, level) {
  const key = (topicName || '').trim().toLowerCase()
  const entry = TAXONOMY[key] || GENERIC(topicName)
  return entry[level] || entry.basic
}

export { LEVEL_KEYS }

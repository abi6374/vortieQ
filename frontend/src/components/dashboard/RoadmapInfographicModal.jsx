import React, { useRef, useState, useMemo } from 'react'
import html2canvas from 'html2canvas'
import jsPDF from 'jspdf'

/**
 * High-Fidelity Role-Specific Curriculums
 * Provides detailed, industry-standard 24-week curriculums for all major tech tracks.
 */
const ROLE_CURRICULUM_DATABASE = {
  fullstack: {
    matchRegex: /full.?stack|web|frontend|react|node|javascript|software|developer/i,
    title: 'Full-Stack Developer Roadmap',
    months: [
      {
        monthNumber: 1,
        theme: 'Foundations & Modern Frontend',
        weeks: [
          {
            week_number: 1,
            title: 'HTML5, Modern CSS & Responsive UI',
            desc: 'Semantic markup, Flexbox, CSS Grid, mobile-first design, and WCAG accessibility standards.',
          },
          {
            week_number: 2,
            title: 'Modern JavaScript (ES6+)',
            desc: 'Async/Await, Promises, Closures, DOM manipulation, Fetch API, and Event Loop internals.',
          },
          {
            week_number: 3,
            title: 'TypeScript Fundamentals',
            desc: 'Static typing, Interfaces, Generics, Type narrowing, TS configuration, and modern tooling.',
          },
          {
            week_number: 4,
            title: 'Component Architecture & Tailwind CSS',
            desc: 'Utility-first styling, design tokens, Headless UI, responsive components, and dark mode themes.',
          },
        ],
      },
      {
        monthNumber: 2,
        theme: 'Frontend Frameworks & State',
        weeks: [
          {
            week_number: 5,
            title: 'React Core & Advanced Hooks',
            desc: 'Component lifecycle, useState, useEffect, useMemo, useCallback, and Custom Hooks architecture.',
          },
          {
            week_number: 6,
            title: 'State Management & Server State',
            desc: 'Context API, Zustand/Redux Toolkit, TanStack React Query, client caching & optimistic updates.',
          },
          {
            week_number: 7,
            title: 'Next.js & Full-Stack React',
            desc: 'App Router, Server Components, Server-Side Rendering (SSR), SSG, API routes, and Middleware.',
          },
          {
            week_number: 8,
            title: 'Frontend Testing & Performance',
            desc: 'Vitest, React Testing Library, bundle optimization, Web Vitals, and Lighthouse audit fixes.',
          },
        ],
      },
      {
        monthNumber: 3,
        theme: 'Backend Architecture & Databases',
        weeks: [
          {
            week_number: 9,
            title: 'RESTful API Engineering (Node/FastAPI)',
            desc: 'HTTP protocol, REST architecture, request validation, middleware pipelines, and error handling.',
          },
          {
            week_number: 10,
            title: 'PostgreSQL & Relational Modeling',
            desc: 'Schema design, normalization, B-tree indexing, foreign keys, complex JOINs, and ACID transactions.',
          },
          {
            week_number: 11,
            title: 'ORMs & Database Performance',
            desc: 'Prisma / SQLAlchemy, connection pooling, automated migrations, seeding, and query optimization.',
          },
          {
            week_number: 12,
            title: 'Authentication & Web Security',
            desc: 'JWT access/refresh tokens, OAuth2 social login, bcrypt hashing, CORS, CSRF, and rate limiting.',
          },
        ],
      },
      {
        monthNumber: 4,
        theme: 'Advanced APIs, Real-time & DevOps',
        weeks: [
          {
            week_number: 13,
            title: 'GraphQL & Real-time WebSockets',
            desc: 'Schema definition, resolvers, Socket.io, bidirectional streaming, and subscription channels.',
          },
          {
            week_number: 14,
            title: 'Caching & Message Queues',
            desc: 'Redis in-memory caching, cache-aside pattern, BullMQ/RabbitMQ background job queues, and Pub/Sub.',
          },
          {
            week_number: 15,
            title: 'Docker & Containerization',
            desc: 'Dockerfiles, multi-stage builds, docker-compose, container networking, and persistent volumes.',
          },
          {
            week_number: 16,
            title: 'CI/CD Pipelines & Automation',
            desc: 'GitHub Actions, automated test suites, linting workflows, semantic versioning, and staging deployments.',
          },
        ],
      },
      {
        monthNumber: 5,
        theme: 'Cloud Infrastructure & System Design',
        weeks: [
          {
            week_number: 17,
            title: 'Cloud Deployment & Serverless',
            desc: 'AWS S3/EC2, Vercel/Supabase hosting, CDN edge caching, and serverless background execution.',
          },
          {
            week_number: 18,
            title: 'System Design & Scalability',
            desc: 'Microservices vs Monoliths, API gateways, load balancing, horizontal scaling, and DB read replicas.',
          },
          {
            week_number: 19,
            title: 'Monitoring & Observability',
            desc: 'Structured logging, Sentry error tracking, Prometheus metrics, Grafana dashboards, and APM.',
          },
          {
            week_number: 20,
            title: 'Full-Stack SaaS MVP Capstone',
            desc: 'Production app architecture, Stripe subscription billing, multi-tenancy, and transactional email.',
          },
        ],
      },
      {
        monthNumber: 6,
        theme: 'Portfolio, Interview & Placement',
        weeks: [
          {
            week_number: 21,
            title: 'Code Review & Security Hardening',
            desc: 'OWASP Top 10 mitigation, SQLi & XSS protection, static code analysis, and refactoring.',
          },
          {
            week_number: 22,
            title: 'GitHub Portfolio & Technical Docs',
            desc: 'Production live demo deployment, architecture diagrams, Swagger OpenAPI specs, and polished README.',
          },
          {
            week_number: 23,
            title: 'Technical Interview Prep (DSA & Systems)',
            desc: 'Core data structures, algorithm patterns, full-stack system design rounds, and mock interviews.',
          },
          {
            week_number: 24,
            title: 'Career Placement & Industry Networking',
            desc: 'STAR behavioral interview mastery, technical resume tailoring, and open-source contributions.',
          },
        ],
      },
    ],
  },
  ai_engineer: {
    matchRegex: /ai|aiml|machine.?learning|deep.?learning|data.?sci/i,
    title: 'AI Engineer Roadmap',
    months: [
      {
        monthNumber: 1,
        theme: 'Foundations & Mathematical Core',
        weeks: [
          {
            week_number: 1,
            title: 'Python Basics & Scientific Stack',
            desc: 'Master syntax, data structures, OOP concepts, NumPy arrays, and standard libraries.',
          },
          {
            week_number: 2,
            title: 'Math & Linear Algebra for AI',
            desc: 'Linear algebra (matrices, vectors, eigenvalues), multivariate calculus (derivatives, gradients).',
          },
          {
            week_number: 3,
            title: 'Probability & Statistics',
            desc: 'Probability distributions, Bayes theorem, hypothesis testing, and confidence intervals.',
          },
          {
            week_number: 4,
            title: 'Data Wrangling & Exploratory Analysis',
            desc: 'Pandas data cleaning, handling missing values, feature transformation, and Seaborn visualization.',
          },
        ],
      },
      {
        monthNumber: 2,
        theme: 'Core Machine Learning',
        weeks: [
          {
            week_number: 5,
            title: 'Supervised Learning Algorithms',
            desc: 'Linear regression, Logistic regression, decision boundaries, cost functions, and evaluation metrics.',
          },
          {
            week_number: 6,
            title: 'Advanced Ensembles & Tree Models',
            desc: 'Support Vector Machines (SVM), Random Forests, gradient boosting (XGBoost, LightGBM).',
          },
          {
            week_number: 7,
            title: 'scikit-learn & NLP Fundamentals',
            desc: 'Pipeline creation, K-Fold cross-validation, tokenization, lemmatization, TF-IDF, and word embeddings.',
          },
          {
            week_number: 8,
            title: 'End-to-End ML Predictive Project',
            desc: 'Customer churn prediction, time-series forecasting, baseline models, and hyperparameter tuning.',
          },
        ],
      },
      {
        monthNumber: 3,
        theme: 'Deep Learning & Neural Networks',
        weeks: [
          {
            week_number: 9,
            title: 'Intro to Neural Networks',
            desc: 'Perceptron, backpropagation, gradient descent variants, activation functions (ReLU, Sigmoid, GELU).',
          },
          {
            week_number: 10,
            title: 'Feedforward & Deep Architectures',
            desc: 'Multi-layer Perceptrons (MLP), optimizers (Adam, AdamW), regularization (Dropout, BatchNorm).',
          },
          {
            week_number: 11,
            title: 'CNNs & Sequence Models (RNNs)',
            desc: 'Convolutions, pooling layers, image classification, LSTMs, GRUs, and sequence modeling for text.',
          },
          {
            week_number: 12,
            title: 'PyTorch Framework & GPU Acceleration',
            desc: 'Tensors, autograd, PyTorch Lightning, CUDA acceleration, and efficient data loaders.',
          },
        ],
      },
      {
        monthNumber: 4,
        theme: 'Computer Vision & Transfer Learning',
        weeks: [
          {
            week_number: 13,
            title: 'Computer Vision Mini-Project',
            desc: 'Custom image classifier pipeline, data augmentation, visual embeddings, and confusion matrices.',
          },
          {
            week_number: 14,
            title: 'Transfer Learning & Fine-Tuning',
            desc: 'Pretrained backbones (ResNet, EfficientNet, ViT), feature extraction, and layer freezing techniques.',
          },
          {
            week_number: 15,
            title: 'Semantic Segmentation Fundamentals',
            desc: 'U-Net architecture, pixel-wise classification, IoU and Dice coefficient evaluation metrics.',
          },
          {
            week_number: 16,
            title: 'Object Detection & YOLO',
            desc: 'YOLO architectures, bounding box regression, anchor boxes, NMS, and real-time inference.',
          },
        ],
      },
      {
        monthNumber: 5,
        theme: 'Generative AI, LLMs & MLOps',
        weeks: [
          {
            week_number: 17,
            title: 'Model Deployment & Serving',
            desc: 'Docker containerization, FastAPI inference endpoints, ONNX runtime, and AWS SageMaker deployment.',
          },
          {
            week_number: 18,
            title: 'Transformers & Diffusion Models',
            desc: 'Self-attention mechanisms, Transformer encoder-decoder, BERT, GPT architectures, and Stable Diffusion.',
          },
          {
            week_number: 19,
            title: 'Fine-Tuning LLMs with LoRA & QLoRA',
            desc: 'PEFT techniques, LoRA adapter weights, quantization (4-bit/8-bit), and HuggingFace TRL pipelines.',
          },
          {
            week_number: 20,
            title: 'Enterprise RAG Chatbot Architecture',
            desc: 'Retrieval-Augmented Generation, vector databases (Chroma/Pinecone), LangChain/LlamaIndex, and rerankers.',
          },
        ],
      },
      {
        monthNumber: 6,
        theme: 'Portfolio, AI Systems & Job Prep',
        weeks: [
          {
            week_number: 21,
            title: 'Autonomous AI Agents & Tool Use',
            desc: 'ReAct agent loops, function calling, external tool integration, and agentic workflows.',
          },
          {
            week_number: 22,
            title: 'End-to-End MLOps Capstone Project',
            desc: 'Model registry, CI/CD for ML, drift monitoring (Evidently AI), and production cloud deployment.',
          },
          {
            week_number: 23,
            title: 'AI System Design & Mock Interviews',
            desc: 'ML system design architectures, recommendation systems, latency vs accuracy trade-offs, and DSA.',
          },
          {
            week_number: 24,
            title: 'Portfolio Showcase & Placement',
            desc: 'Interactive HuggingFace Spaces demo, GitHub repository polish, and technical recruiter networking.',
          },
        ],
      },
    ],
  },
  devops: {
    matchRegex: /devops|cloud|infrastructure|sre|platform|aws|kubernetes/i,
    title: 'Cloud & DevOps Engineer Roadmap',
    months: [
      {
        monthNumber: 1,
        theme: 'Linux Internals & Networking',
        weeks: [
          {
            week_number: 1,
            title: 'Linux Systems & Bash Automation',
            desc: 'Kernel architecture, systemd, process isolation, permissions, shell scripting, and cron jobs.',
          },
          {
            week_number: 2,
            title: 'Networking & Web Protocols',
            desc: 'TCP/IP, DNS, HTTP/HTTPS, SSL/TLS certificates, load balancing, and firewall rules (iptables).',
          },
          {
            week_number: 3,
            title: 'GitOps & Version Control Patterns',
            desc: 'Trunk-based development, git branching strategies, merge conflict resolution, and submodules.',
          },
          {
            week_number: 4,
            title: 'Python / Go for Automation',
            desc: 'Automating system maintenance, REST API clients, CLI tooling, and SDK integrations.',
          },
        ],
      },
      {
        monthNumber: 2,
        theme: 'Containers & Docker Architecture',
        weeks: [
          {
            week_number: 5,
            title: 'Docker Engine & Container Builds',
            desc: 'Namespaces, cgroups, multi-stage Dockerfiles, image minimization, and vulnerability scanning.',
          },
          {
            week_number: 6,
            title: 'Docker Compose & Multi-Container Apps',
            desc: 'Service networking, volume mounts, environment secrets, and local developer environment orchestration.',
          },
          {
            week_number: 7,
            title: 'Container Security & Registries',
            desc: 'Trivy scanning, rootless containers, Docker Hub / AWS ECR, and image signing with Cosign.',
          },
          {
            week_number: 8,
            title: 'Containerized Microservices Project',
            desc: 'Deploying frontend, backend, Redis cache, and PostgreSQL database with health checks.',
          },
        ],
      },
      {
        monthNumber: 3,
        theme: 'Cloud Architecture & AWS Services',
        weeks: [
          {
            week_number: 9,
            title: 'AWS Compute & IAM Governance',
            desc: 'IAM roles and least-privilege policies, EC2 instances, Auto Scaling Groups, and SSH key management.',
          },
          {
            week_number: 10,
            title: 'VPC Networking & Storage',
            desc: 'Public/private subnets, NAT gateways, Route 53, S3 storage classes, and EBS block storage.',
          },
          {
            week_number: 11,
            title: 'Serverless & Database Managed Services',
            desc: 'AWS Lambda, API Gateway, Amazon RDS PostgreSQL, DynamoDB, and CloudWatch alarms.',
          },
          {
            week_number: 12,
            title: 'Cloud Cost Optimization & Multi-Region',
            desc: 'Reserved instances, Spot pricing, AWS Budgets, CloudFront CDN, and disaster recovery architectures.',
          },
        ],
      },
      {
        monthNumber: 4,
        theme: 'Infrastructure as Code (Terraform)',
        weeks: [
          {
            week_number: 13,
            title: 'Terraform Fundamentals & Providers',
            desc: 'HCL syntax, resource declarations, variable definitions, and AWS provider configuration.',
          },
          {
            week_number: 14,
            title: 'Terraform State Management',
            desc: 'Remote state in S3, DynamoDB state locking, workspaces, state migrations, and drift detection.',
          },
          {
            week_number: 15,
            title: 'Modular Infrastructure Design',
            desc: 'Reusable Terraform modules for VPCs, EKS clusters, database tiers, and security groups.',
          },
          {
            week_number: 16,
            title: 'IaC Testing & Terragrunt',
            desc: 'tflint, checkov security scanning, Terragrunt DRY patterns, and automated infrastructure tests.',
          },
        ],
      },
      {
        monthNumber: 5,
        theme: 'Kubernetes Orchestration & Helm',
        weeks: [
          {
            week_number: 17,
            title: 'Kubernetes Architecture & Core Objects',
            desc: 'Control plane, Kubelet, Pods, Deployments, ReplicaSets, Namespaces, and Services (ClusterIP/NodePort).',
          },
          {
            week_number: 18,
            title: 'Config, Secrets & Ingress Controllers',
            desc: 'ConfigMaps, sealed secrets, NGINX Ingress Controller, cert-manager automated TLS, and PVC storage.',
          },
          {
            week_number: 19,
            title: 'Helm Package Management & ArgoCD',
            desc: 'Helm chart templating, values overrides, GitOps synchronization with ArgoCD, and canary rollouts.',
          },
          {
            week_number: 20,
            title: 'Production Kubernetes Cluster (EKS)',
            desc: 'Node groups, cluster autoscaler, IAM roles for service accounts (IRSA), and pod security admission.',
          },
        ],
      },
      {
        monthNumber: 6,
        theme: 'Observability, Security & Career Placement',
        weeks: [
          {
            week_number: 21,
            title: 'Prometheus & Grafana Monitoring',
            desc: 'Node exporter, PromQL queries, dashboard visualizations, Alertmanager notifications, and SLA tracking.',
          },
          {
            week_number: 22,
            title: 'Centralized Logging & Tracing (Loki/Jaeger)',
            desc: 'Log aggregation with Promtail/Loki, OpenTelemetry distributed tracing, and request latency analysis.',
          },
          {
            week_number: 23,
            title: 'DevOps System Design & Incident Management',
            desc: 'High availability system design, chaos engineering, post-mortem writeups, and on-call runbooks.',
          },
          {
            week_number: 24,
            title: 'Portfolio Showcase & Placement',
            desc: 'Live infrastructure repo showcase, resume tailoring for Cloud/SRE roles, and interview preparation.',
          },
        ],
      },
    ],
  },
  cybersecurity: {
    matchRegex: /cyber|security|infosec|soc|penetration|ethical.?hack/i,
    title: 'Cybersecurity Engineer Roadmap',
    months: [
      {
        monthNumber: 1,
        theme: 'Security Fundamentals & Networking',
        weeks: [
          { week_number: 1, title: 'Security Architecture & CIA Triad', desc: 'Confidentiality, integrity, availability, threat modeling, and defense-in-depth principles.' },
          { week_number: 2, title: 'Network Protocols & Wireshark Analysis', desc: 'Packet inspection, TCP/IP headers, ARP spoofing detection, DNS analysis, and port scanning.' },
          { week_number: 3, title: 'Linux & Windows Security Hardening', desc: 'Access control lists (ACLs), registry auditing, SELinux, firewall configuration, and baseline hardening.' },
          { week_number: 4, title: 'Applied Cryptography & PKI', desc: 'Symmetric/asymmetric encryption (AES, RSA), hashing (SHA-256), digital signatures, and certificate management.' },
        ],
      },
      {
        monthNumber: 2,
        theme: 'Defensive Security & SOC Operations',
        weeks: [
          { week_number: 5, title: 'SIEM Architecture & Splunk / ELK', desc: 'Log aggregation, parsing Syslog, building detection dashboards, and correlating security events.' },
          { week_number: 6, title: 'Threat Hunting & MITRE ATT&CK', desc: 'Mapping adversary techniques, behavioral analysis, indicator of compromise (IoC) extraction, and YARA rules.' },
          { week_number: 7, title: 'Incident Response & Digital Forensics', desc: 'Memory dump analysis with Volatility, disk forensic imaging (Autopsy), and incident response lifecycle.' },
          { week_number: 8, title: 'Endpoint Detection & Response (EDR)', desc: 'Telemetry analysis, behavioral blocking, ransomware mitigation, and alert triage playbooks.' },
        ],
      },
      {
        monthNumber: 3,
        theme: 'Application Security & Web Attacks',
        weeks: [
          { week_number: 9, title: 'OWASP Top 10 Web Vulnerabilities', desc: 'SQL Injection, Cross-Site Scripting (XSS), CSRF, SSRF, IDOR, and Broken Authentication exploitation.' },
          { week_number: 10, title: 'Burp Suite & Dynamic Application Testing', desc: 'Proxying HTTP requests, intruder brute forcing, repeater analysis, and automated security scans.' },
          { week_number: 11, title: 'Secure Code Review & SAST / DAST', desc: 'Static code analysis (Semgrep, SonarQube), dependency vulnerability auditing, and remediation.' },
          { week_number: 12, title: 'API Security & OAuth Flaws', desc: 'JWT tampering, mass assignment, rate-limit bypassing, and securing REST / GraphQL endpoints.' },
        ],
      },
      {
        monthNumber: 4,
        theme: 'Offensive Security & Penetration Testing',
        weeks: [
          { week_number: 13, title: 'Reconnaissance & Vulnerability Scanning', desc: 'OSINT gathering, Nmap advanced scripts, Nessus vulnerability assessments, and target profiling.' },
          { week_number: 14, title: 'Metasploit Framework & Exploitation', desc: 'Payload generation (msfvenom), exploit modules, post-exploitation enumeration, and privilege escalation.' },
          { week_number: 15, title: 'Linux Privilege Escalation', desc: 'SUID binaries, sudo misconfigurations, cron job hijacking, kernel exploits, and LinPEAS automation.' },
          { week_number: 16, title: 'Active Directory & Network Pivoting', desc: 'Kerberoasting, Pass-the-Hash, BloodHound path mapping, and pivoting with SSH tunnels.' },
        ],
      },
      {
        monthNumber: 5,
        theme: 'Cloud Security & DevSecOps',
        weeks: [
          { week_number: 17, title: 'AWS Cloud Security & IAM Auditing', desc: 'S3 bucket misconfigurations, IAM privilege escalation, CloudTrail auditing, and GuardDuty alerts.' },
          { week_number: 18, title: 'Container & Kubernetes Security', desc: 'Container escape techniques, image vulnerability scanning, K8s RBAC audit, and Falco runtime security.' },
          { week_number: 19, title: 'CI/CD Security Automation', desc: 'Secret scanning (GitGuardian), automated SAST in GitHub Actions, and container image policy enforcement.' },
          { week_number: 20, title: 'Infrastructure as Code Security', desc: 'Scanning Terraform scripts for misconfigurations using Checkov, tfsec, and policy-as-code with OPA.' },
        ],
      },
      {
        monthNumber: 6,
        theme: 'Certifications, Reporting & Job Placement',
        weeks: [
          { week_number: 21, title: 'Security Governance & Compliance', desc: 'NIST CSF, ISO 27001, SOC2 frameworks, GDPR compliance requirements, and risk assessment writeups.' },
          { week_number: 22, title: 'Professional Penetration Test Reporting', desc: 'Writing executive summaries, CVSS score calculations, technical risk documentation, and remediation plans.' },
          { week_number: 23, title: 'Certification Prep & Hands-on Labs', desc: 'CompTIA Security+, CEH, BJT, or OSCP lab preparation, TryHackMe/HackTheBox machine walkthroughs.' },
          { week_number: 24, title: 'Resume Tailoring & Technical Interviews', desc: 'STAR methodology for security scenario questions, code auditing challenges, and placement prep.' },
        ],
      },
    ],
  },
}

/**
 * Returns a high-fidelity, deterministic 24-week curriculum tailored for the specific target role.
 */
function resolveCurriculumForRole(targetRole, roadmap) {
  const roleStr = (targetRole || roadmap?.path?.goal_text || 'Full-Stack Developer').toLowerCase()
  
  // Find closest matching role template
  let matchedTemplate = ROLE_CURRICULUM_DATABASE.fullstack
  if (ROLE_CURRICULUM_DATABASE.ai_engineer.matchRegex.test(roleStr)) {
    matchedTemplate = ROLE_CURRICULUM_DATABASE.ai_engineer
  } else if (ROLE_CURRICULUM_DATABASE.devops.matchRegex.test(roleStr)) {
    matchedTemplate = ROLE_CURRICULUM_DATABASE.devops
  } else if (ROLE_CURRICULUM_DATABASE.cybersecurity.matchRegex.test(roleStr)) {
    matchedTemplate = ROLE_CURRICULUM_DATABASE.cybersecurity
  }

  // Calculate completed weeks from real roadmap state
  const completedWeekNumbers = new Set()
  if (roadmap?.weeks && Array.isArray(roadmap.weeks)) {
    roadmap.weeks.forEach((w) => {
      if (w.is_complete || (w.completed_steps && w.completed_steps === w.total_steps)) {
        completedWeekNumbers.add(w.week_number)
      }
    })
  }

  // Build clean months and weeks
  const months = matchedTemplate.months.map((month) => ({
    monthNumber: month.monthNumber,
    theme: month.theme,
    weeks: month.weeks.map((wk) => ({
      week_number: wk.week_number,
      title: wk.title,
      desc: wk.desc,
      isComplete: completedWeekNumbers.has(wk.week_number),
    })),
  }))

  return {
    roleTitle: targetRole || matchedTemplate.title,
    months,
  }
}

/**
 * RoadmapInfographicModal
 * Infographic flowchart matching the user's reference diagram, guaranteed deterministic,
 * full 24-week curriculum, and high-DPI 1-click vector PDF export.
 */
export default function RoadmapInfographicModal({
  isOpen,
  onClose,
  roadmap,
  targetRole = 'Full-Stack Developer',
  cleanGoalTitle = 'Full-Stack Developer',
}) {
  const posterRef = useRef(null)
  const [isExporting, setIsExporting] = useState(false)
  const [downloadSuccess, setDownloadSuccess] = useState(false)

  const curriculum = useMemo(() => {
    return resolveCurriculumForRole(cleanGoalTitle || targetRole, roadmap)
  }, [cleanGoalTitle, targetRole, roadmap])

  const totalWeeks = useMemo(() => {
    return curriculum.months.reduce((acc, m) => acc + m.weeks.length, 0)
  }, [curriculum])

  const handleDownloadPDF = async () => {
    if (!posterRef.current || isExporting) return
    setIsExporting(true)
    setDownloadSuccess(false)
    try {
      const element = posterRef.current
      const canvas = await html2canvas(element, {
        scale: 2, // High resolution for crisp printing
        useCORS: true,
        backgroundColor: '#fafbfc',
        logging: false,
        windowWidth: 1100,
      })

      const imgData = canvas.toDataURL('image/png')
      const imgWidth = 210 // A4 width in mm
      const pageHeight = 297 // A4 height in mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width

      const pdf = new jsPDF('p', 'mm', 'a4')
      let heightLeft = imgHeight
      let position = 0

      if (imgHeight <= pageHeight) {
        pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight, undefined, 'FAST')
      } else {
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight, undefined, 'FAST')
        heightLeft -= pageHeight

        while (heightLeft > 0) {
          position = heightLeft - imgHeight
          pdf.addPage()
          pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight, undefined, 'FAST')
          heightLeft -= pageHeight
        }
      }

      const safeTitle = (cleanGoalTitle || targetRole || 'Career')
        .replace(/[^a-zA-Z0-9_-]/g, '_')
      pdf.save(`${safeTitle}_Roadmap_PathFinder.pdf`)
      setDownloadSuccess(true)
      setTimeout(() => setDownloadSuccess(false), 4000)
    } catch (err) {
      console.error('Error generating PDF roadmap:', err)
    } finally {
      setIsExporting(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-2 sm:p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-white dark:bg-[#0E131E] w-full max-w-5xl h-[94vh] rounded-3xl border border-[#e0e0e0] dark:border-[#202B3C] shadow-2xl flex flex-col overflow-hidden">
        
        {/* MODAL CONTROLS HEADER */}
        <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-[#f0f0f0] dark:border-[#1E2638] bg-white dark:bg-[#0E131E] flex-none z-20">
          <div className="flex items-center gap-3">
            <span className="w-9 h-9 rounded-xl bg-[#eaf2fc] dark:bg-[#1A2840] text-[#0066cc] dark:text-[#38BDF8] flex items-center justify-center font-bold text-sm shadow-xs">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" y1="13" x2="8" y2="13" />
                <line x1="16" y1="17" x2="8" y2="17" />
                <polyline points="10 9 9 9 8 9" />
              </svg>
            </span>
            <div>
              <h2 className="font-['Manrope'] font-bold text-base text-[#1d1d1f] dark:text-white">
                Roadmap Poster & PDF Export
              </h2>
              <p className="text-xs text-[#7a7a7a] dark:text-[#94A3B8]">
                Infographic flowchart tailored for {curriculum.roleTitle} ({totalWeeks} weeks)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={handleDownloadPDF}
              disabled={isExporting}
              className="inline-flex items-center gap-2 px-4 py-2 bg-[#0066cc] hover:bg-[#004fa3] text-white text-xs font-bold rounded-xl transition-all shadow-md active:scale-[0.98] disabled:opacity-50 cursor-pointer"
            >
              {isExporting ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Generating PDF...</span>
                </>
              ) : downloadSuccess ? (
                <>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  <span>Downloaded!</span>
                </>
              ) : (
                <>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="7 10 12 15 17 10" />
                    <line x1="12" y1="15" x2="12" y2="3" />
                  </svg>
                  <span>Download Roadmap PDF</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-full flex items-center justify-center text-[#7a7a7a] hover:text-[#1d1d1f] hover:bg-[#f0f0f0] dark:hover:bg-[#1E2638] dark:hover:text-white transition-colors cursor-pointer"
              aria-label="Close modal"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        </div>

        {/* SCROLLABLE POSTER CANVAS CONTAINER */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-8 bg-[#f1f3f6] dark:bg-[#080B10] flex justify-center pf-custom-scrollbar">
          
          {/* THE INFOGRAPHIC POSTER ELEMENT (Exported to PDF via html2canvas) */}
          <div
            ref={posterRef}
            className="w-full max-w-[860px] bg-[#fafbfc] border border-[#e2e8f0] rounded-3xl p-6 sm:p-10 shadow-lg text-[#1d1d1f] flex flex-col items-center relative"
            style={{ fontFamily: "'Inter', sans-serif" }}
          >
            {/* Top Title Banner Header */}
            <div className="w-full flex flex-col items-center mb-8 relative">
              <div className="w-full max-w-lg bg-[#E2EBE5] border-2 border-[#CBD8CE] rounded-2xl py-3.5 px-6 text-center shadow-xs flex items-center justify-center gap-3">
                <span className="text-2xl" role="img" aria-label="AI bot">🤖</span>
                <h1 className="font-['Manrope'] font-extrabold text-xl sm:text-2xl text-[#1E293B] tracking-tight">
                  {curriculum.roleTitle} Roadmap
                </h1>
                <span className="text-2xl" role="img" aria-label="AI bot">🤖</span>
              </div>
              <p className="text-xs text-[#64748B] font-semibold mt-2.5 text-center">
                Personalized {totalWeeks}-Week Strategic Path · Calibrated by PathFinder AI
              </p>
            </div>

            {/* START GREEN MARKER */}
            <div className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-[#10B981] text-white text-xs font-black tracking-wider uppercase shadow-sm mb-2 z-10">
              <span>START</span>
            </div>

            {/* Top Central Spine Connector */}
            <div className="w-[3px] h-6 bg-[#334155]" />

            {/* FLOWCHART MONTHS & WEEKS TREE */}
            <div className="w-full space-y-6 relative flex flex-col items-center">
              {curriculum.months.map((month, mIdx) => {
                const oddWeeks = month.weeks.filter((_, idx) => idx % 2 === 0)
                const evenWeeks = month.weeks.filter((_, idx) => idx % 2 === 1)

                return (
                  <div key={month.monthNumber} className="w-full flex flex-col items-center relative">
                    
                    {/* CENTRAL MONTH BOX */}
                    <div className="z-10 bg-white border-2 border-dashed border-[#F59E0B] rounded-2xl px-6 py-3 text-center shadow-sm max-w-[280px] w-full">
                      <span className="text-[11px] font-black text-[#D97706] uppercase tracking-wider block">
                        MONTH {month.monthNumber}
                      </span>
                      <span className="font-bold text-xs sm:text-sm text-[#1E293B] leading-tight block mt-0.5">
                        {month.theme}
                      </span>
                    </div>

                    {/* HORIZONTAL CONNECTOR & WEEKS BRANCHING ROW */}
                    <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-y-4 gap-x-8 mt-5 relative items-stretch">
                      
                      {/* Left Column (Weeks 1 & 3 of Month) */}
                      <div className="flex flex-col gap-4">
                        {oddWeeks.map((week) => (
                          <div
                            key={week.week_number}
                            className="relative bg-[#FFFBEB] border-2 border-dashed border-[#FCD34D] rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col justify-between hover:shadow-md transition-shadow"
                          >
                            <div className="flex items-center justify-between mb-2">
                              <span className="px-2.5 py-0.5 bg-[#FEF3C7] border border-[#FDE68A] text-[#92400E] text-[10px] font-extrabold uppercase tracking-wider rounded-md">
                                WEEK {week.week_number}
                              </span>
                              {week.isComplete && (
                                <span className="text-[10px] font-bold text-[#059669] bg-[#D1FAE5] px-2 py-0.5 rounded-md border border-[#A7F3D0]">
                                  ✓ Completed
                                </span>
                              )}
                            </div>
                            <h3 className="font-bold text-xs sm:text-sm text-[#1E293B] leading-snug">
                              {week.title}
                            </h3>
                            <p className="text-[11px] text-[#64748B] mt-1.5 leading-relaxed font-normal">
                              {week.desc}
                            </p>
                          </div>
                        ))}
                      </div>

                      {/* Right Column (Weeks 2 & 4 of Month) */}
                      <div className="flex flex-col gap-4">
                        {evenWeeks.map((week) => (
                          <div
                            key={week.week_number}
                            className="relative bg-[#EFF6FF] border-2 border-dashed border-[#BFDBFE] rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col justify-between hover:shadow-md transition-shadow"
                          >
                            <div className="flex items-center justify-between mb-2">
                              <span className="px-2.5 py-0.5 bg-[#DBEAFE] border border-[#BFDBFE] text-[#1E40AF] text-[10px] font-extrabold uppercase tracking-wider rounded-md">
                                WEEK {week.week_number}
                              </span>
                              {week.isComplete && (
                                <span className="text-[10px] font-bold text-[#059669] bg-[#D1FAE5] px-2 py-0.5 rounded-md border border-[#A7F3D0]">
                                  ✓ Completed
                                </span>
                              )}
                            </div>
                            <h3 className="font-bold text-xs sm:text-sm text-[#1E293B] leading-snug">
                              {week.title}
                            </h3>
                            <p className="text-[11px] text-[#64748B] mt-1.5 leading-relaxed font-normal">
                              {week.desc}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Central Spine Diamond Node & Vertical Line to Next Month */}
                    {mIdx < curriculum.months.length - 1 && (
                      <div className="flex flex-col items-center my-4">
                        <div className="w-[3px] h-5 bg-[#334155]" />
                        <div className="w-3.5 h-3.5 bg-[#0F172A] transform rotate-45 my-1" />
                        <div className="w-[3px] h-5 bg-[#334155]" />
                      </div>
                    )}
                  </div>
                )
              })}
            </div>

            {/* Bottom Vertical Spine Connector to Finish */}
            <div className="w-[3px] h-6 bg-[#334155] mt-4" />

            {/* FINISH RED MARKER */}
            <div className="inline-flex items-center gap-1.5 px-5 py-2 rounded-lg bg-[#EF4444] text-white text-xs font-black tracking-wider uppercase shadow-sm mt-1 z-10">
              <span>FINISH</span>
            </div>

            {/* POSTER FOOTER */}
            <div className="w-full pt-8 mt-8 border-t border-[#e2e8f0] flex flex-col sm:flex-row items-center justify-between gap-2 text-[10px] text-[#94A3B8]">
              <span>Generated on {new Date().toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}</span>
              <span className="font-semibold text-[#64748B]">PathFinder AI · Personalized Learning Platform</span>
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}

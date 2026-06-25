// Structured Mock Interview Data

export const MOCK_QUESTIONS = {
  frontend: [
    {
      id: "fe_1",
      question: "Explain the difference between client-side rendering (CSR) and server-side rendering (SSR). When would you choose one over the other?",
      keywords: ["SEO", "first paint", "hydration", "performance", "server load", "TTI", "Next.js", "SPA"]
    },
    {
      id: "fe_2",
      question: "What is the event loop in JavaScript and how does it handle asynchronous operations?",
      keywords: ["call stack", "callback queue", "microtask queue", "macrotask", "non-blocking", "single-threaded", "promises"]
    },
    {
      id: "fe_3",
      question: "How do you optimize a web page's performance? What Core Web Vitals do you focus on?",
      keywords: ["LCP", "FID", "CLS", "INP", "lazy loading", "bundling", "CDN", "minification", "caching", "critical path"]
    },
    {
      id: "fe_4",
      question: "How does React state management work under the hood, and what are the trade-offs of using Context API versus state management libraries like Redux or Zustand?",
      keywords: ["re-rendering", "prop drilling", "store", "actions", "dispatch", "provider", "global state", "performance"]
    },
    {
      id: "fe_5",
      question: "What is your approach to making web applications fully accessible? What standards do you follow?",
      keywords: ["WCAG", "ARIA", "semantic HTML", "screen readers", "keyboard navigation", "contrast ratio", "focus management"]
    }
  ],
  backend: [
    {
      id: "be_1",
      question: "What are the trade-offs between SQL (relational) and NoSQL (non-relational) databases? When would you use which?",
      keywords: ["ACID", "schema", "scalability", "sharding", "joins", "document store", "key-value", "consistency", "normalization"]
    },
    {
      id: "be_2",
      question: "How do you secure a REST API? Describe the authentication and authorization mechanisms you would put in place.",
      keywords: ["JWT", "OAuth", "HTTPS", "CORS", "rate limiting", "sanitization", "RBAC", "hashing", "bcrypt", "CSRF"]
    },
    {
      id: "be_3",
      question: "Explain what caching is, what caching strategies you know, and how you prevent cache stampede or cache invalidation issues.",
      keywords: ["Redis", "Memcached", "TTL", "cache-aside", "write-through", "eviction", "LRU", "stale-while-revalidate"]
    },
    {
      id: "be_4",
      question: "Describe your approach to designing a highly scalable microservices architecture. How do they communicate with each other?",
      keywords: ["gRPC", "message broker", "Kafka", "RabbitMQ", "REST", "service discovery", "circuit breaker", "API gateway", "event-driven"]
    },
    {
      id: "be_5",
      question: "How do you diagnose and resolve a severe performance bottleneck in a production database query?",
      keywords: ["indexing", "EXPLAIN plan", "query optimization", "connection pooling", "read replicas", "normalization", "profiling"]
    }
  ],
  datascientist: [
    {
      id: "ds_1",
      question: "What is the difference between overfitting and underfitting in a machine learning model, and how do you address them?",
      keywords: ["variance", "bias", "regularization", "cross-validation", "dropout", "early stopping", "feature selection", "pruning"]
    },
    {
      id: "ds_2",
      question: "Explain the difference between L1 (Lasso) and L2 (Ridge) regularization. How do they impact model coefficients?",
      keywords: ["sparsity", "absolute error", "squared error", "feature selection", "penalty", "coefficients", "Lasso", "Ridge"]
    },
    {
      id: "ds_3",
      question: "What metrics would you use to evaluate a highly imbalanced binary classification model? Why is accuracy not suitable?",
      keywords: ["F1-score", "precision", "recall", "ROC-AUC", "confusion matrix", "SMOTE", "true positive rate", "false positives"]
    },
    {
      id: "ds_4",
      question: "How does a Random Forest model work under the hood? What are the advantages of ensemble learning over single decision trees?",
      keywords: ["bagging", "bootstrap aggregation", "decision trees", "entropy", "Gini impurity", "out-of-bag", "variance reduction"]
    },
    {
      id: "ds_5",
      question: "Explain the central limit theorem and its practical significance in statistical hypothesis testing.",
      keywords: ["normal distribution", "sample size", "mean", "sampling distribution", "standard error", "p-value", "null hypothesis"]
    }
  ],
  productmanager: [
    {
      id: "pm_1",
      question: "How do you decide what features to build next? What prioritization frameworks have you used, and how do you apply them?",
      keywords: ["RICE score", "Kano model", "MoSCoW", "ROI", "impact", "effort", "stakeholder alignment", "customer feedback", "KPIs"]
    },
    {
      id: "pm_2",
      question: "Imagine we are launching a new product and the initial adoption metrics are extremely low. What is your step-by-step diagnostic framework?",
      keywords: ["funnel analysis", "user feedback", "onboarding", "product-market fit", "friction points", "retention", "A/B testing"]
    },
    {
      id: "pm_3",
      question: "How do you manage conflicting priorities between the engineering team, design team, and business stakeholders?",
      keywords: ["negotiation", "roadmap", "data-driven decisions", "compromise", "clear objectives", "KPI alignment", "transparency"]
    },
    {
      id: "pm_4",
      question: "How do you define and measure the success of a feature post-launch? What primary metrics do you track?",
      keywords: ["DAU", "MAU", "activation", "churn rate", "NPS", "conversion rate", "retention", "LTV", "engagement metrics"]
    },
    {
      id: "pm_5",
      question: "Describe a time you had to make a critical product decision without complete data. What was your process?",
      keywords: ["risk mitigation", "intuition", "qualitative insights", "MVP", "iterative testing", "hypotheses", "contingency plan"]
    }
  ],
  behavioral: [
    {
      id: "bh_1",
      question: "Describe a situation where you had a significant disagreement with a colleague or manager. How did you handle it and what was the outcome?",
      keywords: ["communication", "active listening", "compromise", "professionalism", "resolution", "constructive feedback", "collaboration"]
    },
    {
      id: "bh_2",
      question: "Tell me about a time you missed a deadline or failed to deliver a key commitment. What did you learn and how did you adjust?",
      keywords: ["accountability", "transparency", "lessons learned", "time management", "prioritization", "communication", "remediation"]
    },
    {
      id: "bh_3",
      question: "Describe a challenging project you took on under a tight timeline. How did you organize your work to ensure success?",
      keywords: ["milestones", "delegation", "scope reduction", "agile", "focus", "collaboration", "adaptability", "efficiency"]
    },
    {
      id: "bh_4",
      question: "Give an example of a time when you went above and beyond your standard job description to solve a problem.",
      keywords: ["initiative", "problem solving", "ownership", "proactive", "impact", "leadership", "resourcefulness"]
    },
    {
      id: "bh_5",
      question: "How do you handle receiving critical constructive feedback about your performance? Describe a specific instance.",
      keywords: ["growth mindset", "active listening", "reflection", "action plan", "improvement", "professional growth", "acceptance"]
    }
  ]
};

export function getQuestionsByRole(role) {
  return MOCK_QUESTIONS[role] || MOCK_QUESTIONS.behavioral;
}

export function getRoleLabel(role) {
  const labels = {
    frontend: "Frontend Engineer",
    backend: "Backend Engineer",
    datascientist: "Data Scientist",
    productmanager: "Product Manager",
    behavioral: "General Behavioral"
  };
  return labels[role] || "Interviewee";
}

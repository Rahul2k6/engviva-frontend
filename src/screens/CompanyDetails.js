import React, {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  useNavigate,
  useParams,
} from "react-router-dom";

import { auth } from "../firebase";

const API_BASE =
  import.meta.env.VITE_API_URL ||
  "https://engviva-backend.onrender.com";

/* =========================================================
   FALLBACK DATA
   Backend / Firestore takes priority.
========================================================= */
const FALLBACK_COMPANIES = {
  google: {
    id: "google",
    name: "Google",
    domain: "google.com",
    category: "Technology",
    description:
      "A role-focused engineering preparation environment covering software, data, cloud and AI-oriented pathways.",
    headquarters: "Mountain View, California",
    color: "#4285F4",
    roles: [
      "Software Engineer",
      "Data Engineer",
      "ML Engineer",
      "Cloud Engineer",
      "DevOps Engineer",
    ],
    rounds: [
      {
        id: "aptitude",
        number: 1,
        title: "Aptitude & Fundamentals",
        shortTitle: "Aptitude",
        type: "ASSESSMENT",
        description:
          "Reasoning, quantitative ability and engineering fundamentals.",
        duration: "30 MIN",
        levels: 2,
        status: "available",
      },
      {
        id: "technical",
        number: 2,
        title: "Technical Assessment",
        shortTitle: "Technical",
        type: "ASSESSMENT",
        description:
          "Core CS concepts, engineering fundamentals and role-specific knowledge.",
        duration: "45 MIN",
        levels: 2,
        status: "locked",
      },
      {
        id: "coding",
        number: 3,
        title: "Coding Assessment",
        shortTitle: "Coding",
        type: "CODING",
        description:
          "Problem solving, algorithms, complexity and implementation.",
        duration: "60 MIN",
        levels: 2,
        status: "locked",
      },
      {
        id: "interview",
        number: 4,
        title: "Technical Interview",
        shortTitle: "Technical Interview",
        type: "INTERVIEW",
        description:
          "Engineering reasoning, communication and technical depth.",
        duration: "30 MIN",
        levels: 2,
        status: "locked",
      },
      {
        id: "hr",
        number: 5,
        title: "ENGVIVA AI Interview",
        shortTitle: "AI HR",
        type: "AI INTERVIEW",
        description:
          "A timed, role-specific interview simulation with adaptive evaluation.",
        duration: "30 MIN",
        levels: 30,
        status: "locked",
      },
    ],
  },

  microsoft: {
    id: "microsoft",
    name: "Microsoft",
    domain: "microsoft.com",
    category: "Technology",
    description:
      "Software, cloud, AI, infrastructure and enterprise engineering roles.",
    headquarters: "Redmond, Washington",
    color: "#7FBA00",
    roles: [
      "Software Engineer",
      "Cloud Engineer",
      "AI Engineer",
      "DevOps Engineer",
      "Data Engineer",
    ],
    rounds: [
      {
        id: "aptitude",
        number: 1,
        title: "Online Assessment & Logic",
        shortTitle: "Aptitude",
        type: "ASSESSMENT",
        description:
          "Analytical reasoning, CS fundamentals, and logic evaluation.",
        duration: "30 MIN",
        levels: 2,
        status: "available",
      },
      {
        id: "technical",
        number: 2,
        title: "Technical Assessment",
        shortTitle: "Technical",
        type: "ASSESSMENT",
        description:
          "Data structures, system architecture, OS, and cloud fundamentals.",
        duration: "45 MIN",
        levels: 2,
        status: "locked",
      },
      {
        id: "coding",
        number: 3,
        title: "Coding Round",
        shortTitle: "Coding",
        type: "CODING",
        description:
          "Algorithm design, clean code practices, and edge-case handling.",
        duration: "60 MIN",
        levels: 2,
        status: "locked",
      },
      {
        id: "interview",
        number: 4,
        title: "Technical Interview",
        shortTitle: "Technical Interview",
        type: "INTERVIEW",
        description:
          "Deep dive into algorithms, system design, and past projects.",
        duration: "45 MIN",
        levels: 2,
        status: "locked",
      },
      {
        id: "hr",
        number: 5,
        title: "ENGVIVA AI Interview",
        shortTitle: "AI HR",
        type: "AI INTERVIEW",
        description:
          "Behavioral evaluation, leadership principles, and cultural alignment.",
        duration: "30 MIN",
        levels: 30,
        status: "locked",
      },
    ],
  },

  amazon: {
    id: "amazon",
    name: "Amazon",
    domain: "amazon.com",
    category: "Technology",
    description:
      "Large-scale software, cloud, infrastructure and data engineering.",
    headquarters: "Seattle, Washington",
    color: "#FF9900",
    roles: [
      "Software Development Engineer",
      "Cloud Engineer",
      "Data Engineer",
      "DevOps Engineer",
      "Solutions Architect",
    ],
    rounds: [
      {
        id: "aptitude",
        number: 1,
        title: "Online Assessment (OA1)",
        shortTitle: "OA 1",
        type: "ASSESSMENT",
        description: "Code debugging, logic reasoning, and CS foundations.",
        duration: "30 MIN",
        levels: 2,
        status: "available",
      },
      {
        id: "coding",
        number: 2,
        title: "Coding Assessment (OA2)",
        shortTitle: "Coding",
        type: "CODING",
        description:
          "Data structures, algorithms, and Leadership Principle work simulations.",
        duration: "70 MIN",
        levels: 2,
        status: "locked",
      },
      {
        id: "technical",
        number: 3,
        title: "System Design & Low-Level Design",
        shortTitle: "Design",
        type: "ASSESSMENT",
        description:
          "Object-oriented design, scalability, and distributed systems.",
        duration: "45 MIN",
        levels: 2,
        status: "locked",
      },
      {
        id: "interview",
        number: 4,
        title: "Technical Interview",
        shortTitle: "Tech Round",
        type: "INTERVIEW",
        description:
          "Live coding, problem-solving efficiency, and technical trade-offs.",
        duration: "45 MIN",
        levels: 2,
        status: "locked",
      },
      {
        id: "hr",
        number: 5,
        title: "ENGVIVA AI Interview",
        shortTitle: "Bar Raiser",
        type: "AI INTERVIEW",
        description:
          "Amazon Leadership Principles and customer obsession evaluation.",
        duration: "30 MIN",
        levels: 30,
        status: "locked",
      },
    ],
  },

  apple: {
    id: "apple",
    name: "Apple",
    domain: "apple.com",
    category: "Technology",
    description:
      "Software, systems, hardware and platform engineering opportunities.",
    headquarters: "Cupertino, California",
    color: "#A3AAAE",
    roles: [
      "Software Engineer",
      "iOS Developer",
      "Systems Engineer",
      "ML Engineer",
    ],
    rounds: [
      {
        id: "aptitude",
        number: 1,
        title: "CS & Systems Fundamentals",
        shortTitle: "Fundamentals",
        type: "ASSESSMENT",
        description:
          "Memory management, computer architecture, and OS principles.",
        duration: "35 MIN",
        levels: 2,
        status: "available",
      },
      {
        id: "technical",
        number: 2,
        title: "Domain Technical Assessment",
        shortTitle: "Technical",
        type: "ASSESSMENT",
        description:
          "Platform architecture, concurrency, and performance tuning.",
        duration: "45 MIN",
        levels: 2,
        status: "locked",
      },
      {
        id: "coding",
        number: 3,
        title: "Coding & Data Structures",
        shortTitle: "Coding",
        type: "CODING",
        description:
          "Clean, optimized algorithmic problem solving in C++, Swift, or Java.",
        duration: "60 MIN",
        levels: 2,
        status: "locked",
      },
      {
        id: "interview",
        number: 4,
        title: "System Architecture Interview",
        shortTitle: "Tech Interview",
        type: "INTERVIEW",
        description:
          "Deep systems reasoning, hardware-software boundary, and code review.",
        duration: "45 MIN",
        levels: 2,
        status: "locked",
      },
      {
        id: "hr",
        number: 5,
        title: "ENGVIVA AI Interview",
        shortTitle: "AI Culture",
        type: "AI INTERVIEW",
        description:
          "Attention to detail, engineering excellence, and behavioral alignment.",
        duration: "30 MIN",
        levels: 30,
        status: "locked",
      },
    ],
  },

  meta: {
    id: "meta",
    name: "Meta",
    domain: "meta.com",
    category: "Technology",
    description: "Software, AI, infrastructure and product engineering roles.",
    headquarters: "Menlo Park, California",
    color: "#0866FF",
    roles: [
      "Software Engineer",
      "ML Engineer",
      "Data Engineer",
      "Infrastructure Engineer",
    ],
    rounds: [
      {
        id: "aptitude",
        number: 1,
        title: "Technical Screening Assessment",
        shortTitle: "Screening",
        type: "ASSESSMENT",
        description:
          "Quantitative aptitude, computational logic, and CS basics.",
        duration: "30 MIN",
        levels: 2,
        status: "available",
      },
      {
        id: "coding",
        number: 2,
        title: "Speed Coding Round",
        shortTitle: "Coding 1",
        type: "CODING",
        description: "Solving 2 algorithmic problems within a 45-minute window.",
        duration: "45 MIN",
        levels: 2,
        status: "locked",
      },
      {
        id: "technical",
        number: 3,
        title: "System Design & Architecture",
        shortTitle: "Sys Design",
        type: "ASSESSMENT",
        description:
          "High-throughput systems, caching, storage, and API design.",
        duration: "45 MIN",
        levels: 2,
        status: "locked",
      },
      {
        id: "interview",
        number: 4,
        title: "Technical Architecture Interview",
        shortTitle: "Interview",
        type: "INTERVIEW",
        description:
          "Live code implementation and technical architecture defense.",
        duration: "45 MIN",
        levels: 2,
        status: "locked",
      },
      {
        id: "hr",
        number: 5,
        title: "ENGVIVA AI Interview",
        shortTitle: "AI HR",
        type: "AI INTERVIEW",
        description:
          "Fast-paced decision making, project ownership, and behavioral evaluation.",
        duration: "30 MIN",
        levels: 30,
        status: "locked",
      },
    ],
  },

  nvidia: {
    id: "nvidia",
    name: "NVIDIA",
    domain: "nvidia.com",
    category: "AI & Semiconductor",
    description: "AI, GPU computing, systems and semiconductor engineering.",
    headquarters: "Santa Clara, California",
    color: "#76B900",
    roles: [
      "Software Engineer",
      "AI Engineer",
      "ML Engineer",
      "Systems Engineer",
    ],
    rounds: [
      {
        id: "aptitude",
        number: 1,
        title: "Math & Systems Foundations",
        shortTitle: "Math & Logic",
        type: "ASSESSMENT",
        description:
          "Linear algebra, probability, OS internals, and hardware basics.",
        duration: "35 MIN",
        levels: 2,
        status: "available",
      },
      {
        id: "technical",
        number: 2,
        title: "Parallel & GPU Architecture",
        shortTitle: "Architecture",
        type: "ASSESSMENT",
        description:
          "Concurrency, memory models, CUDA principles, and compiler optimization.",
        duration: "45 MIN",
        levels: 2,
        status: "locked",
      },
      {
        id: "coding",
        number: 3,
        title: "Systems & Algorithms Coding",
        shortTitle: "Coding",
        type: "CODING",
        description:
          "Low-level C/C++ memory optimization and algorithm implementation.",
        duration: "60 MIN",
        levels: 2,
        status: "locked",
      },
      {
        id: "interview",
        number: 4,
        title: "Technical Deep-Dive Interview",
        shortTitle: "Deep Dive",
        type: "INTERVIEW",
        description:
          "Detailed discussion on computing hardware, drivers, or ML models.",
        duration: "45 MIN",
        levels: 2,
        status: "locked",
      },
      {
        id: "hr",
        number: 5,
        title: "ENGVIVA AI Interview",
        shortTitle: "AI HR",
        type: "AI INTERVIEW",
        description:
          "Research mindset, innovation agility, and technical collaboration.",
        duration: "30 MIN",
        levels: 30,
        status: "locked",
      },
    ],
  },

  ibm: {
    id: "ibm",
    name: "IBM",
    domain: "ibm.com",
    category: "Technology",
    description: "Enterprise software, cloud, AI, cybersecurity and consulting.",
    headquarters: "Armonk, New York",
    color: "#0F62FE",
    roles: [
      "Software Engineer",
      "Cloud Engineer",
      "Data Engineer",
      "AI Engineer",
      "Cybersecurity Engineer",
    ],
    rounds: [
      {
        id: "aptitude",
        number: 1,
        title: "Cognitive Ability Assessment",
        shortTitle: "Cognitive",
        type: "ASSESSMENT",
        description:
          "Game-based cognitive challenge, logical reasoning, and aptitude.",
        duration: "30 MIN",
        levels: 2,
        status: "available",
      },
      {
        id: "technical",
        number: 2,
        title: "Technical & Cloud Assessment",
        shortTitle: "Technical",
        type: "ASSESSMENT",
        description:
          "Enterprise architectures, databases, cloud, and security basics.",
        duration: "45 MIN",
        levels: 2,
        status: "locked",
      },
      {
        id: "coding",
        number: 3,
        title: "Coding Assessment",
        shortTitle: "Coding",
        type: "CODING",
        description:
          "Algorithm design, data structures, and object-oriented paradigms.",
        duration: "60 MIN",
        levels: 2,
        status: "locked",
      },
      {
        id: "interview",
        number: 4,
        title: "Technical Interview",
        shortTitle: "Tech Round",
        type: "INTERVIEW",
        description:
          "Problem solving, domain specialization, and practical project reviews.",
        duration: "30 MIN",
        levels: 2,
        status: "locked",
      },
      {
        id: "hr",
        number: 5,
        title: "ENGVIVA AI Interview",
        shortTitle: "AI HR",
        type: "AI INTERVIEW",
        description:
          "Client-facing readiness, problem ownership, and corporate adaptability.",
        duration: "30 MIN",
        levels: 30,
        status: "locked",
      },
    ],
  },

  oracle: {
    id: "oracle",
    name: "Oracle",
    domain: "oracle.com",
    category: "Enterprise",
    description:
      "Cloud infrastructure, enterprise software and database engineering.",
    headquarters: "Austin, Texas",
    color: "#F80000",
    roles: [
      "Software Engineer",
      "Cloud Engineer",
      "Database Engineer",
      "DevOps Engineer",
    ],
    rounds: [
      {
        id: "aptitude",
        number: 1,
        title: "Aptitude & Core CS",
        shortTitle: "Aptitude",
        type: "ASSESSMENT",
        description:
          "Reasoning, CS fundamental MCQs (DBMS, OS, Networks, OOP).",
        duration: "40 MIN",
        levels: 2,
        status: "available",
      },
      {
        id: "technical",
        number: 2,
        title: "Database & Cloud Architecture",
        shortTitle: "Database",
        type: "ASSESSMENT",
        description:
          "SQL indexing, normalization, concurrency, and cloud infrastructure.",
        duration: "45 MIN",
        levels: 2,
        status: "locked",
      },
      {
        id: "coding",
        number: 3,
        title: "Coding Round",
        shortTitle: "Coding",
        type: "CODING",
        description:
          "Data structures, string manipulation, trees, and dynamic programming.",
        duration: "60 MIN",
        levels: 2,
        status: "locked",
      },
      {
        id: "interview",
        number: 4,
        title: "Technical Interview",
        shortTitle: "Tech Interview",
        type: "INTERVIEW",
        description:
          "Database internals, scalable backend architecture, and live coding.",
        duration: "45 MIN",
        levels: 2,
        status: "locked",
      },
      {
        id: "hr",
        number: 5,
        title: "ENGVIVA AI Interview",
        shortTitle: "AI HR",
        type: "AI INTERVIEW",
        description:
          "Enterprise adaptability, communication, and situational judgment.",
        duration: "30 MIN",
        levels: 30,
        status: "locked",
      },
    ],
  },

  salesforce: {
    id: "salesforce",
    name: "Salesforce",
    domain: "salesforce.com",
    category: "SaaS",
    description:
      "Cloud software, platform engineering and enterprise applications.",
    headquarters: "San Francisco, California",
    color: "#00A1E0",
    roles: [
      "Software Engineer",
      "Backend Developer",
      "Cloud Engineer",
      "Data Engineer",
    ],
    rounds: [
      {
        id: "aptitude",
        number: 1,
        title: "Online Assessment (OA)",
        shortTitle: "Online Test",
        type: "ASSESSMENT",
        description: "HackerRank assessment covering CS fundamentals and DSA.",
        duration: "45 MIN",
        levels: 2,
        status: "available",
      },
      {
        id: "technical",
        number: 2,
        title: "SaaS & Cloud Design",
        shortTitle: "SaaS Design",
        type: "ASSESSMENT",
        description:
          "Multi-tenant architecture, RESTful API design, and asynchronous patterns.",
        duration: "45 MIN",
        levels: 2,
        status: "locked",
      },
      {
        id: "coding",
        number: 3,
        title: "Data Structures & Algorithms",
        shortTitle: "Coding",
        type: "CODING",
        description:
          "Complex algorithmic problem solving and modular code design.",
        duration: "60 MIN",
        levels: 2,
        status: "locked",
      },
      {
        id: "interview",
        number: 4,
        title: "Technical Interview",
        shortTitle: "Tech Round",
        type: "INTERVIEW",
        description:
          "Object-oriented modeling, system scalability, and code walkthrough.",
        duration: "45 MIN",
        levels: 2,
        status: "locked",
      },
      {
        id: "hr",
        number: 5,
        title: "ENGVIVA AI Interview",
        shortTitle: "AI Ohana",
        type: "AI INTERVIEW",
        description:
          "Trust, customer success, innovation, and equality core values.",
        duration: "30 MIN",
        levels: 30,
        status: "locked",
      },
    ],
  },

  adobe: {
    id: "adobe",
    name: "Adobe",
    domain: "adobe.com",
    category: "Technology",
    description:
      "Creative software, cloud products, AI and platform engineering.",
    headquarters: "San Jose, California",
    color: "#FF0000",
    roles: [
      "Software Engineer",
      "Frontend Developer",
      "Backend Developer",
      "ML Engineer",
    ],
    rounds: [
      {
        id: "aptitude",
        number: 1,
        title: "Aptitude & Math Challenge",
        shortTitle: "Aptitude",
        type: "ASSESSMENT",
        description:
          "Quantitative aptitude, discrete mathematics, and CS basics.",
        duration: "35 MIN",
        levels: 2,
        status: "available",
      },
      {
        id: "technical",
        number: 2,
        title: "Core CS & Graphics/Web Systems",
        shortTitle: "Technical",
        type: "ASSESSMENT",
        description:
          "Data structures, memory optimization, graphics pipelines, or web engines.",
        duration: "45 MIN",
        levels: 2,
        status: "locked",
      },
      {
        id: "coding",
        number: 3,
        title: "Advanced Coding Round",
        shortTitle: "Coding",
        type: "CODING",
        description:
          "Advanced data structures (trees, graphs, DP) and modular solutions.",
        duration: "60 MIN",
        levels: 2,
        status: "locked",
      },
      {
        id: "interview",
        number: 4,
        title: "Technical Interview",
        shortTitle: "Tech Interview",
        type: "INTERVIEW",
        description:
          "Architecture evaluation, live coding, and algorithm optimization.",
        duration: "45 MIN",
        levels: 2,
        status: "locked",
      },
      {
        id: "hr",
        number: 5,
        title: "ENGVIVA AI Interview",
        shortTitle: "AI HR",
        type: "AI INTERVIEW",
        description:
          "Creative problem solving, teamwork, and product-minded mindset.",
        duration: "30 MIN",
        levels: 30,
        status: "locked",
      },
    ],
  },

  cisco: {
    id: "cisco",
    name: "Cisco",
    domain: "cisco.com",
    category: "Networking",
    description:
      "Networking, cybersecurity, cloud and infrastructure engineering.",
    headquarters: "San Jose, California",
    color: "#1BA0D7",
    roles: [
      "Network Engineer",
      "Software Engineer",
      "Cybersecurity Engineer",
      "Cloud Engineer",
    ],
    rounds: [
      {
        id: "aptitude",
        number: 1,
        title: "Aptitude & Networking Basics",
        shortTitle: "Aptitude",
        type: "ASSESSMENT",
        description:
          "Logical reasoning, OSI model, TCP/IP, and switching concepts.",
        duration: "35 MIN",
        levels: 2,
        status: "available",
      },
      {
        id: "technical",
        number: 2,
        title: "Systems & Network Protocols",
        shortTitle: "Technical",
        type: "ASSESSMENT",
        description:
          "Socket programming, network security, packet routing, and OS concepts.",
        duration: "45 MIN",
        levels: 2,
        status: "locked",
      },
      {
        id: "coding",
        number: 3,
        title: "Coding Assessment",
        shortTitle: "Coding",
        type: "CODING",
        description:
          "Data structures, bit manipulation, strings, and graph algorithms.",
        duration: "60 MIN",
        levels: 2,
        status: "locked",
      },
      {
        id: "interview",
        number: 4,
        title: "Technical Interview",
        shortTitle: "Tech Round",
        type: "INTERVIEW",
        description:
          "Network architecture discussions, debugging protocols, and code walkthrough.",
        duration: "30 MIN",
        levels: 2,
        status: "locked",
      },
      {
        id: "hr",
        number: 5,
        title: "ENGVIVA AI Interview",
        shortTitle: "AI HR",
        type: "AI INTERVIEW",
        description:
          "Problem ownership, ethical compliance, and behavioral communication.",
        duration: "30 MIN",
        levels: 30,
        status: "locked",
      },
    ],
  },

  intel: {
    id: "intel",
    name: "Intel",
    domain: "intel.com",
    category: "Semiconductor",
    description: "Processors, systems, software and semiconductor engineering.",
    headquarters: "Santa Clara, California",
    color: "#0071C5",
    roles: [
      "Software Engineer",
      "Systems Engineer",
      "Embedded Engineer",
      "AI Engineer",
    ],
    rounds: [
      {
        id: "aptitude",
        number: 1,
        title: "Aptitude & Digital Logic",
        shortTitle: "Aptitude",
        type: "ASSESSMENT",
        description:
          "Quantitative ability, logic gates, binary systems, and microprocessor basics.",
        duration: "30 MIN",
        levels: 2,
        status: "available",
      },
      {
        id: "technical",
        number: 2,
        title: "Computer Architecture & C",
        shortTitle: "Technical",
        type: "ASSESSMENT",
        description:
          "Paging, cache coherence, assembly/C fundamentals, and device drivers.",
        duration: "45 MIN",
        levels: 2,
        status: "locked",
      },
      {
        id: "coding",
        number: 3,
        title: "Systems Coding Assessment",
        shortTitle: "Coding",
        type: "CODING",
        description:
          "Low-level memory management, pointers, linked lists, and algorithms.",
        duration: "60 MIN",
        levels: 2,
        status: "locked",
      },
      {
        id: "interview",
        number: 4,
        title: "Hardware/Software Technical Interview",
        shortTitle: "Tech Interview",
        type: "INTERVIEW",
        description:
          "Deep exploration of hardware-software co-design, OS, and debugging.",
        duration: "45 MIN",
        levels: 2,
        status: "locked",
      },
      {
        id: "hr",
        number: 5,
        title: "ENGVIVA AI Interview",
        shortTitle: "AI HR",
        type: "AI INTERVIEW",
        description:
          "Analytical tenacity, team dynamics, and engineering ethics.",
        duration: "30 MIN",
        levels: 30,
        status: "locked",
      },
    ],
  },

  accenture: {
    id: "accenture",
    name: "Accenture",
    domain: "accenture.com",
    category: "Consulting",
    description:
      "Technology consulting, cloud, data, AI and enterprise engineering.",
    headquarters: "Dublin, Ireland",
    color: "#A100FF",
    roles: [
      "Software Engineer",
      "Cloud Engineer",
      "Data Engineer",
      "DevOps Engineer",
      "Cybersecurity Engineer",
    ],
    rounds: [
      {
        id: "aptitude",
        number: 1,
        title: "Cognitive & Critical Reasoning",
        shortTitle: "Cognitive",
        type: "ASSESSMENT",
        description:
          "English ability, critical thinking, abstract reasoning, and numerical ability.",
        duration: "40 MIN",
        levels: 2,
        status: "available",
      },
      {
        id: "technical",
        number: 2,
        title: "Technical Assessment",
        shortTitle: "Technical",
        type: "ASSESSMENT",
        description:
          "Pseudo-code analysis, common cloud applications, and network security basics.",
        duration: "45 MIN",
        levels: 2,
        status: "locked",
      },
      {
        id: "coding",
        number: 3,
        title: "Coding Assessment",
        shortTitle: "Coding",
        type: "CODING",
        description:
          "Basic to intermediate algorithmic problems in any preferred language.",
        duration: "45 MIN",
        levels: 2,
        status: "locked",
      },
      {
        id: "interview",
        number: 4,
        title: "Communication Assessment",
        shortTitle: "Communication",
        type: "ASSESSMENT",
        description:
          "Automated oral fluency, vocabulary, pronunciation, and listening.",
        duration: "20 MIN",
        levels: 2,
        status: "locked",
      },
      {
        id: "hr",
        number: 5,
        title: "ENGVIVA AI Interview",
        shortTitle: "AI HR",
        type: "AI INTERVIEW",
        description:
          "Consulting aptitude, client-handling scenarios, and project readiness.",
        duration: "30 MIN",
        levels: 30,
        status: "locked",
      },
    ],
  },

  deloitte: {
    id: "deloitte",
    name: "Deloitte",
    domain: "deloitte.com",
    category: "Consulting",
    description:
      "Technology consulting, analytics, cloud and enterprise solutions.",
    headquarters: "London, United Kingdom",
    color: "#86BC25",
    roles: [
      "Software Engineer",
      "Data Analyst",
      "Cloud Engineer",
      "Cybersecurity Engineer",
    ],
    rounds: [
      {
        id: "aptitude",
        number: 1,
        title: "Aptitude & Versant Test",
        shortTitle: "Aptitude",
        type: "ASSESSMENT",
        description:
          "Quantitative, logical, and verbal communication competencies.",
        duration: "35 MIN",
        levels: 2,
        status: "available",
      },
      {
        id: "technical",
        number: 2,
        title: "IT & Domain Knowledge",
        shortTitle: "Technical",
        type: "ASSESSMENT",
        description:
          "Databases, SDLC, object-oriented concepts, and cloud computing.",
        duration: "45 MIN",
        levels: 2,
        status: "locked",
      },
      {
        id: "coding",
        number: 3,
        title: "Coding & Logic Round",
        shortTitle: "Coding",
        type: "CODING",
        description:
          "Data structures and algorithmic coding with strong focus on edge cases.",
        duration: "45 MIN",
        levels: 2,
        status: "locked",
      },
      {
        id: "interview",
        number: 4,
        title: "Technical & Case Interview",
        shortTitle: "Case Tech",
        type: "INTERVIEW",
        description:
          "Technical discussions, business case solving, and architecture design.",
        duration: "30 MIN",
        levels: 2,
        status: "locked",
      },
      {
        id: "hr",
        number: 5,
        title: "ENGVIVA AI Interview",
        shortTitle: "AI HR",
        type: "AI INTERVIEW",
        description:
          "Consulting etiquette, leadership qualities, and cultural compatibility.",
        duration: "30 MIN",
        levels: 30,
        status: "locked",
      },
    ],
  },

  tcs: {
    id: "tcs",
    name: "TCS",
    domain: "tcs.com",
    category: "Indian IT",
    description:
      "IT services, software engineering, cloud and enterprise technology.",
    headquarters: "Mumbai, India",
    color: "#0056A6",
    roles: [
      "Software Engineer",
      "System Engineer",
      "Cloud Engineer",
      "Data Engineer",
    ],
    rounds: [
      {
        id: "aptitude",
        number: 1,
        title: "TCS NQT Foundation",
        shortTitle: "NQT Aptitude",
        type: "ASSESSMENT",
        description:
          "Numerical ability, verbal ability, and reasoning capability.",
        duration: "60 MIN",
        levels: 2,
        status: "available",
      },
      {
        id: "technical",
        number: 2,
        title: "Advanced CS & Technical MCQ",
        shortTitle: "Technical",
        type: "ASSESSMENT",
        description:
          "Pseudo-code, algorithms, DBMS, operating systems, and computer networks.",
        duration: "40 MIN",
        levels: 2,
        status: "locked",
      },
      {
        id: "coding",
        number: 3,
        title: "TCS Advanced Coding Round",
        shortTitle: "Coding",
        type: "CODING",
        description:
          "Two coding questions (Ninja and Digital track standard problems).",
        duration: "60 MIN",
        levels: 2,
        status: "locked",
      },
      {
        id: "interview",
        number: 4,
        title: "Technical Interview (TR)",
        shortTitle: "TR Round",
        type: "INTERVIEW",
        description:
          "Core programming, academic project review, and technical fundamentals.",
        duration: "30 MIN",
        levels: 2,
        status: "locked",
      },
      {
        id: "hr",
        number: 5,
        title: "ENGVIVA AI Interview",
        shortTitle: "MR & HR",
        type: "AI INTERVIEW",
        description:
          "Managerial and HR behavioral assessment with adaptive questions.",
        duration: "30 MIN",
        levels: 30,
        status: "locked",
      },
    ],
  },

  infosys: {
    id: "infosys",
    name: "Infosys",
    domain: "infosys.com",
    category: "Indian IT",
    description:
      "Digital engineering, consulting, cloud and enterprise technology.",
    headquarters: "Bengaluru, India",
    color: "#007CC3",
    roles: [
      "Systems Engineer",
      "Software Engineer",
      "Data Engineer",
      "DevOps Engineer",
    ],
    rounds: [
      {
        id: "aptitude",
        number: 1,
        title: "Aptitude & Reasoning",
        shortTitle: "Aptitude",
        type: "ASSESSMENT",
        description:
          "Quantitative ability, logical reasoning and verbal fundamentals.",
        duration: "30 MIN",
        levels: 2,
        status: "available",
      },
      {
        id: "technical",
        number: 2,
        title: "Technical Assessment",
        shortTitle: "Technical",
        type: "ASSESSMENT",
        description:
          "Programming fundamentals, databases, operating systems and networks.",
        duration: "45 MIN",
        levels: 2,
        status: "locked",
      },
      {
        id: "coding",
        number: 3,
        title: "Coding Round",
        shortTitle: "Coding",
        type: "CODING",
        description:
          "Algorithmic thinking and implementation under time constraints.",
        duration: "60 MIN",
        levels: 2,
        status: "locked",
      },
      {
        id: "technical-interview",
        number: 4,
        title: "Technical Interview",
        shortTitle: "Interview",
        type: "INTERVIEW",
        description: "Role-specific technical discussion and problem solving.",
        duration: "30 MIN",
        levels: 2,
        status: "locked",
      },
      {
        id: "hr",
        number: 5,
        title: "ENGVIVA AI Interview",
        shortTitle: "AI HR",
        type: "AI INTERVIEW",
        description:
          "Adaptive interview simulation evaluating technical communication and decision making.",
        duration: "30 MIN",
        levels: 30,
        status: "locked",
      },
    ],
  },

  wipro: {
    id: "wipro",
    name: "Wipro",
    domain: "wipro.com",
    category: "Indian IT",
    description: "IT services, cloud, cybersecurity and digital engineering.",
    headquarters: "Bengaluru, India",
    color: "#341F6E",
    roles: [
      "Project Engineer",
      "Software Engineer",
      "Cloud Engineer",
      "Cybersecurity Engineer",
    ],
    rounds: [
      {
        id: "aptitude",
        number: 1,
        title: "NLTH Aptitude & Verbal",
        shortTitle: "Aptitude",
        type: "ASSESSMENT",
        description: "Quantitative, logical reasoning, and verbal comprehension.",
        duration: "45 MIN",
        levels: 2,
        status: "available",
      },
      {
        id: "technical",
        number: 2,
        title: "Written Communication (Essay/Technical)",
        shortTitle: "Written Test",
        type: "ASSESSMENT",
        description:
          "Written communication evaluation and basic computing knowledge.",
        duration: "30 MIN",
        levels: 2,
        status: "locked",
      },
      {
        id: "coding",
        number: 3,
        title: "Online Coding Test",
        shortTitle: "Coding",
        type: "CODING",
        description:
          "Two coding questions focused on loops, arrays, and string manipulations.",
        duration: "45 MIN",
        levels: 2,
        status: "locked",
      },
      {
        id: "interview",
        number: 4,
        title: "Technical Interview",
        shortTitle: "Tech Round",
        type: "INTERVIEW",
        description:
          "Basics of C/Java/Python, DBMS concepts, and final year project discussion.",
        duration: "30 MIN",
        levels: 2,
        status: "locked",
      },
      {
        id: "hr",
        number: 5,
        title: "ENGVIVA AI Interview",
        shortTitle: "AI HR",
        type: "AI INTERVIEW",
        description:
          "Work adaptability, willingness to relocate, and career vision.",
        duration: "30 MIN",
        levels: 30,
        status: "locked",
      },
    ],
  },

  hcltech: {
    id: "hcltech",
    name: "HCLTech",
    domain: "hcltech.com",
    category: "Indian IT",
    description:
      "Engineering services, cloud, software and digital transformation.",
    headquarters: "Noida, India",
    color: "#0070C0",
    roles: [
      "Software Engineer",
      "Cloud Engineer",
      "DevOps Engineer",
      "Data Engineer",
    ],
    rounds: [
      {
        id: "aptitude",
        number: 1,
        title: "Aptitude & Logical Ability",
        shortTitle: "Aptitude",
        type: "ASSESSMENT",
        description:
          "General aptitude, arithmetic ability, and analytical reasoning.",
        duration: "35 MIN",
        levels: 2,
        status: "available",
      },
      {
        id: "technical",
        number: 2,
        title: "Technical Knowledge Assessment",
        shortTitle: "Technical",
        type: "ASSESSMENT",
        description:
          "Programming basics, databases, operating systems, and web technologies.",
        duration: "45 MIN",
        levels: 2,
        status: "locked",
      },
      {
        id: "coding",
        number: 3,
        title: "Hands-on Coding Round",
        shortTitle: "Coding",
        type: "CODING",
        description:
          "Fundamental algorithmic logic, array structures, and sorting.",
        duration: "45 MIN",
        levels: 2,
        status: "locked",
      },
      {
        id: "interview",
        number: 4,
        title: "Technical Interview",
        shortTitle: "TR Interview",
        type: "INTERVIEW",
        description:
          "Hands-on technical validation and resume skill verification.",
        duration: "30 MIN",
        levels: 2,
        status: "locked",
      },
      {
        id: "hr",
        number: 5,
        title: "ENGVIVA AI Interview",
        shortTitle: "AI HR",
        type: "AI INTERVIEW",
        description:
          "Interpersonal communication, conflict resolution, and professionalism.",
        duration: "30 MIN",
        levels: 30,
        status: "locked",
      },
    ],
  },

  techmahindra: {
    id: "techmahindra",
    name: "Tech Mahindra",
    domain: "techmahindra.com",
    category: "Indian IT",
    description:
      "Digital engineering, telecom, cloud and enterprise technology.",
    headquarters: "Pune, India",
    color: "#E31837",
    roles: [
      "Software Engineer",
      "Network Engineer",
      "Cloud Engineer",
      "DevOps Engineer",
    ],
    rounds: [
      {
        id: "aptitude",
        number: 1,
        title: "Aptitude & English Assessment",
        shortTitle: "Aptitude",
        type: "ASSESSMENT",
        description:
          "Quantitative, logical reasoning, and English language proficiency.",
        duration: "40 MIN",
        levels: 2,
        status: "available",
      },
      {
        id: "technical",
        number: 2,
        title: "Technical & Telecom Concepts",
        shortTitle: "Technical",
        type: "ASSESSMENT",
        description:
          "Basics of networks, cloud concepts, Linux, and database queries.",
        duration: "45 MIN",
        levels: 2,
        status: "locked",
      },
      {
        id: "coding",
        number: 3,
        title: "Coding & Pseudo-Code",
        shortTitle: "Coding",
        type: "CODING",
        description:
          "Solving logic questions and coding implementation in C/C++/Java/Python.",
        duration: "45 MIN",
        levels: 2,
        status: "locked",
      },
      {
        id: "interview",
        number: 4,
        title: "Technical Interview",
        shortTitle: "Tech Round",
        type: "INTERVIEW",
        description:
          "Practical knowledge verification, OOP concepts, and project queries.",
        duration: "30 MIN",
        levels: 2,
        status: "locked",
      },
      {
        id: "hr",
        number: 5,
        title: "ENGVIVA AI Interview",
        shortTitle: "AI HR",
        type: "AI INTERVIEW",
        description:
          "Organizational culture fit, adaptability, and leadership potential.",
        duration: "30 MIN",
        levels: 30,
        status: "locked",
      },
    ],
  },

  cognizant: {
    id: "cognizant",
    name: "Cognizant",
    domain: "cognizant.com",
    category: "Indian IT",
    description: "Digital engineering, cloud, AI and enterprise technology.",
    headquarters: "Teaneck, New Jersey",
    color: "#0033A0",
    roles: [
      "Programmer Analyst",
      "Software Engineer",
      "Cloud Engineer",
      "Data Engineer",
    ],
    rounds: [
      {
        id: "aptitude",
        number: 1,
        title: "GenC / GenC Next Aptitude",
        shortTitle: "Aptitude",
        type: "ASSESSMENT",
        description:
          "Quantitative, analytical reasoning, and verbal comprehension.",
        duration: "40 MIN",
        levels: 2,
        status: "available",
      },
      {
        id: "technical",
        number: 2,
        title: "Technical & SQL Assessment",
        shortTitle: "Technical",
        type: "ASSESSMENT",
        description:
          "SQL queries, pseudo-code analysis, and CS core subject fundamentals.",
        duration: "45 MIN",
        levels: 2,
        status: "locked",
      },
      {
        id: "coding",
        number: 3,
        title: "Coding Capability Round",
        shortTitle: "Coding",
        type: "CODING",
        description:
          "Algorithmic challenges catering to GenC and GenC Next tracks.",
        duration: "60 MIN",
        levels: 2,
        status: "locked",
      },
      {
        id: "interview",
        number: 4,
        title: "Technical Interview",
        shortTitle: "TR Round",
        type: "INTERVIEW",
        description:
          "Live coding, OOP, database design, and project architecture.",
        duration: "30 MIN",
        levels: 2,
        status: "locked",
      },
      {
        id: "hr",
        number: 5,
        title: "ENGVIVA AI Interview",
        shortTitle: "AI HR",
        type: "AI INTERVIEW",
        description:
          "Adaptive behavioral assessment, communication, and professional conduct.",
        duration: "30 MIN",
        levels: 30,
        status: "locked",
      },
    ],
  },

  ltimindtree: {
    id: "ltimindtree",
    name: "LTIMindtree",
    domain: "ltimindtree.com",
    category: "Indian IT",
    description:
      "Digital transformation, cloud, data and software engineering.",
    headquarters: "Mumbai, India",
    color: "#1D4380",
    roles: [
      "Software Engineer",
      "Data Engineer",
      "Cloud Engineer",
      "DevOps Engineer",
    ],
    rounds: [
      {
        id: "aptitude",
        number: 1,
        title: "Aptitude & Psychometric Test",
        shortTitle: "Aptitude",
        type: "ASSESSMENT",
        description: "Reasoning, numerical ability, and psychometric screening.",
        duration: "40 MIN",
        levels: 2,
        status: "available",
      },
      {
        id: "technical",
        number: 2,
        title: "CS Domain & Pseudo-code",
        shortTitle: "Technical",
        type: "ASSESSMENT",
        description: "Data structures, DBMS, OOP, and web fundamentals.",
        duration: "45 MIN",
        levels: 2,
        status: "locked",
      },
      {
        id: "coding",
        number: 3,
        title: "Coding Round",
        shortTitle: "Coding",
        type: "CODING",
        description:
          "Problem solving with recursion, strings, arrays, and sorting.",
        duration: "45 MIN",
        levels: 2,
        status: "locked",
      },
      {
        id: "interview",
        number: 4,
        title: "Technical Interview",
        shortTitle: "Tech Round",
        type: "INTERVIEW",
        description:
          "Project discussion, core engineering subjects, and scenario solving.",
        duration: "30 MIN",
        levels: 2,
        status: "locked",
      },
      {
        id: "hr",
        number: 5,
        title: "ENGVIVA AI Interview",
        shortTitle: "AI HR",
        type: "AI INTERVIEW",
        description:
          "Client orientation, adaptability, and communication skills.",
        duration: "30 MIN",
        levels: 30,
        status: "locked",
      },
    ],
  },

  persistent: {
    id: "persistent",
    name: "Persistent Systems",
    domain: "persistent.com",
    category: "Indian IT",
    description: "Digital engineering, cloud, data and software products.",
    headquarters: "Pune, India",
    color: "#E31837",
    roles: [
      "Software Engineer",
      "Cloud Engineer",
      "Data Engineer",
      "DevOps Engineer",
    ],
    rounds: [
      {
        id: "aptitude",
        number: 1,
        title: "Aptitude & Computer Fundamentals",
        shortTitle: "Aptitude",
        type: "ASSESSMENT",
        description:
          "Quantitative aptitude, logical reasoning, and CS fundamentals.",
        duration: "40 MIN",
        levels: 2,
        status: "available",
      },
      {
        id: "technical",
        number: 2,
        title: "Advanced CS & OS Architecture",
        shortTitle: "Technical",
        type: "ASSESSMENT",
        description:
          "Operating systems, data structures, DBMS, and network protocols.",
        duration: "45 MIN",
        levels: 2,
        status: "locked",
      },
      {
        id: "coding",
        number: 3,
        title: "Coding Assessment",
        shortTitle: "Coding",
        type: "CODING",
        description:
          "Data structures, algorithms, and complexity analysis problems.",
        duration: "60 MIN",
        levels: 2,
        status: "locked",
      },
      {
        id: "interview",
        number: 4,
        title: "Technical Interview",
        shortTitle: "TR Round",
        type: "INTERVIEW",
        description:
          "Deep dive into DSA, project architecture, and coding logic.",
        duration: "30 MIN",
        levels: 2,
        status: "locked",
      },
      {
        id: "hr",
        number: 5,
        title: "ENGVIVA AI Interview",
        shortTitle: "AI HR",
        type: "AI INTERVIEW",
        description:
          "Culture, adaptability, learning mindset, and behavioral evaluation.",
        duration: "30 MIN",
        levels: 30,
        status: "locked",
      },
    ],
  },

  zoho: {
    id: "zoho",
    name: "Zoho",
    domain: "zoho.com",
    category: "SaaS",
    description:
      "Business software, cloud applications and product engineering.",
    headquarters: "Chennai, India",
    color: "#F44336",
    roles: [
      "Software Developer",
      "Backend Developer",
      "Frontend Developer",
      "QA Engineer",
    ],
    rounds: [
      {
        id: "aptitude",
        number: 1,
        title: "General Aptitude & C Flow",
        shortTitle: "Aptitude",
        type: "ASSESSMENT",
        description: "Math puzzles, reasoning, and C code output prediction.",
        duration: "45 MIN",
        levels: 2,
        status: "available",
      },
      {
        id: "coding",
        number: 2,
        title: "Basic Programming Round",
        shortTitle: "Basic Coding",
        type: "CODING",
        description:
          "Pattern printing, matrix operations, and string algorithms without built-in libraries.",
        duration: "60 MIN",
        levels: 2,
        status: "locked",
      },
      {
        id: "technical",
        number: 3,
        title: "Advanced Programming / Application Design",
        shortTitle: "App Design",
        type: "CODING",
        description:
          "Designing small CLI applications (e.g., Railway Reservation, Snake game) in 2 hours.",
        duration: "90 MIN",
        levels: 2,
        status: "locked",
      },
      {
        id: "interview",
        number: 4,
        title: "Technical Interview",
        shortTitle: "Tech Interview",
        type: "INTERVIEW",
        description:
          "Code walkthrough, OOP principles, and data structure internals.",
        duration: "45 MIN",
        levels: 2,
        status: "locked",
      },
      {
        id: "hr",
        number: 5,
        title: "ENGVIVA AI Interview",
        shortTitle: "AI HR",
        type: "AI INTERVIEW",
        description:
          "Self-learning drive, craft passion, and product mindset evaluation.",
        duration: "30 MIN",
        levels: 30,
        status: "locked",
      },
    ],
  },

  freshworks: {
    id: "freshworks",
    name: "Freshworks",
    domain: "freshworks.com",
    category: "SaaS",
    description: "Cloud software, customer experience and SaaS engineering.",
    headquarters: "San Mateo, California",
    color: "#2D2D2D",
    roles: [
      "Software Engineer",
      "Frontend Developer",
      "Backend Developer",
      "Data Engineer",
    ],
    rounds: [
      {
        id: "aptitude",
        number: 1,
        title: "Online Screening Assessment",
        shortTitle: "Screening",
        type: "ASSESSMENT",
        description:
          "Analytical logic, quantitative aptitude, and core CS fundamentals.",
        duration: "35 MIN",
        levels: 2,
        status: "available",
      },
      {
        id: "technical",
        number: 2,
        title: "SaaS Architecture & Web Tech",
        shortTitle: "Technical",
        type: "ASSESSMENT",
        description:
          "REST APIs, asynchronous queues, caching, and database design.",
        duration: "45 MIN",
        levels: 2,
        status: "locked",
      },
      {
        id: "coding",
        number: 3,
        title: "Algorithmic Coding Round",
        shortTitle: "Coding",
        type: "CODING",
        description:
          "Data structures, clean code modularity, and algorithm optimization.",
        duration: "60 MIN",
        levels: 2,
        status: "locked",
      },
      {
        id: "interview",
        number: 4,
        title: "Technical Interview",
        shortTitle: "Tech Round",
        type: "INTERVIEW",
        description:
          "System design fundamentals, clean code walkthrough, and live coding.",
        duration: "45 MIN",
        levels: 2,
        status: "locked",
      },
      {
        id: "hr",
        number: 5,
        title: "ENGVIVA AI Interview",
        shortTitle: "AI HR",
        type: "AI INTERVIEW",
        description:
          "Customer empathy, agility, and SaaS product engineering culture.",
        duration: "30 MIN",
        levels: 30,
        status: "locked",
      },
    ],
  },

  flipkart: {
    id: "flipkart",
    name: "Flipkart",
    domain: "flipkart.com",
    category: "Indian Product",
    description:
      "E-commerce, distributed systems, logistics and product engineering.",
    headquarters: "Bengaluru, India",
    color: "#2874F0",
    roles: [
      "Software Development Engineer",
      "Data Engineer",
      "Backend Developer",
      "ML Engineer",
    ],
    rounds: [
      {
        id: "aptitude",
        number: 1,
        title: "Online Coding Test",
        shortTitle: "OA Coding",
        type: "CODING",
        description:
          "HackerEarth test with 3 challenging algorithm and data structure problems.",
        duration: "90 MIN",
        levels: 2,
        status: "available",
      },
      {
        id: "technical",
        number: 2,
        title: "Machine Coding Round",
        shortTitle: "Machine Coding",
        type: "CODING",
        description:
          "Low-level design (LLD): write clean, working OOP code within 2 hours.",
        duration: "90 MIN",
        levels: 2,
        status: "locked",
      },
      {
        id: "coding",
        number: 3,
        title: "Problem Solving & DSA Round",
        shortTitle: "DSA Round",
        type: "CODING",
        description:
          "Advanced data structures (Trees, Graphs, DP) and optimization.",
        duration: "60 MIN",
        levels: 2,
        status: "locked",
      },
      {
        id: "interview",
        number: 4,
        title: "System Design Interview",
        shortTitle: "HLD Round",
        type: "INTERVIEW",
        description:
          "High-level architecture, caching, queues, and distributed databases.",
        duration: "45 MIN",
        levels: 2,
        status: "locked",
      },
      {
        id: "hr",
        number: 5,
        title: "ENGVIVA AI Interview",
        shortTitle: "AI Hiring Manager",
        type: "AI INTERVIEW",
        description:
          "Flipkart culture, customer centricity, and engineering ownership.",
        duration: "30 MIN",
        levels: 30,
        status: "locked",
      },
    ],
  },

  phonepe: {
    id: "phonepe",
    name: "PhonePe",
    domain: "phonepe.com",
    category: "FinTech",
    description:
      "Digital payments, financial technology and large-scale backend systems.",
    headquarters: "Bengaluru, India",
    color: "#5F259F",
    roles: [
      "Software Engineer",
      "Backend Developer",
      "Data Engineer",
      "Android Developer",
    ],
    rounds: [
      {
        id: "aptitude",
        number: 1,
        title: "Online Assessment",
        shortTitle: "Online Test",
        type: "CODING",
        description:
          "Complex algorithmic problem solving and optimization challenges.",
        duration: "75 MIN",
        levels: 2,
        status: "available",
      },
      {
        id: "technical",
        number: 2,
        title: "Machine Coding / LLD Round",
        shortTitle: "Machine Coding",
        type: "CODING",
        description:
          "Build an end-to-end working system with modular OOP architecture.",
        duration: "90 MIN",
        levels: 2,
        status: "locked",
      },
      {
        id: "coding",
        number: 3,
        title: "Data Structures & Algorithms",
        shortTitle: "DSA",
        type: "CODING",
        description:
          "High-difficulty algorithmic problem solving and time complexity analysis.",
        duration: "60 MIN",
        levels: 2,
        status: "locked",
      },
      {
        id: "interview",
        number: 4,
        title: "System Design & Concurrency",
        shortTitle: "System Design",
        type: "INTERVIEW",
        description:
          "Transaction processing, idempotency, distributed consistency, and scaling.",
        duration: "45 MIN",
        levels: 2,
        status: "locked",
      },
      {
        id: "hr",
        number: 5,
        title: "ENGVIVA AI Interview",
        shortTitle: "AI HR",
        type: "AI INTERVIEW",
        description:
          "Engineering rigor, FinTech compliance mindset, and culture fit.",
        duration: "30 MIN",
        levels: 30,
        status: "locked",
      },
    ],
  },

  razorpay: {
    id: "razorpay",
    name: "Razorpay",
    domain: "razorpay.com",
    category: "FinTech",
    description:
      "Payments infrastructure, financial technology and platform engineering.",
    headquarters: "Bengaluru, India",
    color: "#3395FF",
    roles: [
      "Software Engineer",
      "Backend Developer",
      "Frontend Developer",
      "Data Engineer",
    ],
    rounds: [
      {
        id: "aptitude",
        number: 1,
        title: "Online Assessment",
        shortTitle: "OA",
        type: "ASSESSMENT",
        description:
          "CS fundamentals, SQL queries, and algorithmic problem solving.",
        duration: "60 MIN",
        levels: 2,
        status: "available",
      },
      {
        id: "technical",
        number: 2,
        title: "Machine Coding / Component Design",
        shortTitle: "Design Coding",
        type: "CODING",
        description:
          "Design and implement a clean, production-grade micro-application.",
        duration: "90 MIN",
        levels: 2,
        status: "locked",
      },
      {
        id: "coding",
        number: 3,
        title: "DSA & Problem Solving",
        shortTitle: "DSA Round",
        type: "CODING",
        description:
          "Advanced data structures, graphs, concurrency, and dynamic programming.",
        duration: "60 MIN",
        levels: 2,
        status: "locked",
      },
      {
        id: "interview",
        number: 4,
        title: "System Architecture & Resiliency",
        shortTitle: "Tech Architecture",
        type: "INTERVIEW",
        description:
          "High-availability payment gateways, message queues, and API gateways.",
        duration: "45 MIN",
        levels: 2,
        status: "locked",
      },
      {
        id: "hr",
        number: 5,
        title: "ENGVIVA AI Interview",
        shortTitle: "AI HR",
        type: "AI INTERVIEW",
        description:
          "Ownership, transparent communication, and fast execution mindset.",
        duration: "30 MIN",
        levels: 30,
        status: "locked",
      },
    ],
  },

  swiggy: {
    id: "swiggy",
    name: "Swiggy",
    domain: "swiggy.com",
    category: "Indian Product",
    description: "Consumer technology, logistics, data and large-scale systems.",
    headquarters: "Bengaluru, India",
    color: "#FC8019",
    roles: [
      "Software Engineer",
      "Backend Developer",
      "Data Engineer",
      "ML Engineer",
    ],
    rounds: [
      {
        id: "aptitude",
        number: 1,
        title: "Online Coding Assessment",
        shortTitle: "OA",
        type: "CODING",
        description:
          "Algorithmic challenges on HackerRank with strict runtime limits.",
        duration: "75 MIN",
        levels: 2,
        status: "available",
      },
      {
        id: "technical",
        number: 2,
        title: "Machine Coding Round",
        shortTitle: "Machine Coding",
        type: "CODING",
        description:
          "Low-level design (LLD) with complete OOP principles and test cases.",
        duration: "90 MIN",
        levels: 2,
        status: "locked",
      },
      {
        id: "coding",
        number: 3,
        title: "DSA & Problem Solving",
        shortTitle: "DSA Round",
        type: "CODING",
        description:
          "Trees, graphs, dynamic programming, and optimization techniques.",
        duration: "60 MIN",
        levels: 2,
        status: "locked",
      },
      {
        id: "interview",
        number: 4,
        title: "System Design Interview",
        shortTitle: "System Design",
        type: "INTERVIEW",
        description:
          "Hyperlocal logistics routing, real-time tracking, and high-load caching.",
        duration: "45 MIN",
        levels: 2,
        status: "locked",
      },
      {
        id: "hr",
        number: 5,
        title: "ENGVIVA AI Interview",
        shortTitle: "AI HR",
        type: "AI INTERVIEW",
        description:
          "Consumer obsession, hustle, and engineering reliability standards.",
        duration: "30 MIN",
        levels: 30,
        status: "locked",
      },
    ],
  },

  zomato: {
    id: "zomato",
    name: "Zomato",
    domain: "zomato.com",
    category: "Indian Product",
    description: "Consumer technology, logistics and data-driven products.",
    headquarters: "Gurugram, India",
    color: "#E23744",
    roles: [
      "Software Engineer",
      "Backend Developer",
      "Data Engineer",
      "ML Engineer",
    ],
    rounds: [
      {
        id: "aptitude",
        number: 1,
        title: "Online Coding Test",
        shortTitle: "OA",
        type: "CODING",
        description: "Three challenging algorithmic questions.",
        duration: "75 MIN",
        levels: 2,
        status: "available",
      },
      {
        id: "technical",
        number: 2,
        title: "Machine Coding & Object Design",
        shortTitle: "Machine Coding",
        type: "CODING",
        description:
          "Design scalable modules with proper class hierarchies and exception handling.",
        duration: "90 MIN",
        levels: 2,
        status: "locked",
      },
      {
        id: "coding",
        number: 3,
        title: "Data Structures Round",
        shortTitle: "DSA",
        type: "CODING",
        description:
          "Complex algorithmic problem solving and live code execution.",
        duration: "60 MIN",
        levels: 2,
        status: "locked",
      },
      {
        id: "interview",
        number: 4,
        title: "High-Level Architecture Interview",
        shortTitle: "Architecture",
        type: "INTERVIEW",
        description:
          "Distributed systems, geohash indexing, databases, and microservices.",
        duration: "45 MIN",
        levels: 2,
        status: "locked",
      },
      {
        id: "hr",
        number: 5,
        title: "ENGVIVA AI Interview",
        shortTitle: "AI Culture",
        type: "AI INTERVIEW",
        description:
          "Product obsession, velocity of execution, and cultural fit.",
        duration: "30 MIN",
        levels: 30,
        status: "locked",
      },
    ],
  },

  siemens: {
    id: "siemens",
    name: "Siemens",
    domain: "siemens.com",
    category: "Engineering",
    description:
      "Industrial automation, digital engineering and intelligent infrastructure.",
    headquarters: "Munich, Germany",
    color: "#009999",
    roles: [
      "Software Engineer",
      "Embedded Engineer",
      "Automation Engineer",
      "Data Engineer",
    ],
    rounds: [
      {
        id: "aptitude",
        number: 1,
        title: "Aptitude & Core Engineering",
        shortTitle: "Aptitude",
        type: "ASSESSMENT",
        description:
          "Logical reasoning, quantitative ability, and digital logic concepts.",
        duration: "35 MIN",
        levels: 2,
        status: "available",
      },
      {
        id: "technical",
        number: 2,
        title: "Industrial & Software Systems",
        shortTitle: "Technical",
        type: "ASSESSMENT",
        description:
          "Embedded C, industrial IoT protocols, C++, and OS scheduling.",
        duration: "45 MIN",
        levels: 2,
        status: "locked",
      },
      {
        id: "coding",
        number: 3,
        title: "Algorithm & Systems Coding",
        shortTitle: "Coding",
        type: "CODING",
        description:
          "Efficient memory management, bitwise operations, and data structure coding.",
        duration: "60 MIN",
        levels: 2,
        status: "locked",
      },
      {
        id: "interview",
        number: 4,
        title: "Technical Interview",
        shortTitle: "Tech Interview",
        type: "INTERVIEW",
        description:
          "Embedded architectures, software-hardware interfaces, and design patterns.",
        duration: "30 MIN",
        levels: 2,
        status: "locked",
      },
      {
        id: "hr",
        number: 5,
        title: "ENGVIVA AI Interview",
        shortTitle: "AI HR",
        type: "AI INTERVIEW",
        description:
          "Quality standards, precision engineering mindset, and team collaboration.",
        duration: "30 MIN",
        levels: 30,
        status: "locked",
      },
    ],
  },

  bosch: {
    id: "bosch",
    name: "Bosch",
    domain: "bosch.com",
    category: "Engineering",
    description:
      "Automotive, embedded systems, IoT and engineering technology.",
    headquarters: "Gerlingen, Germany",
    color: "#E20015",
    roles: [
      "Software Engineer",
      "Embedded Engineer",
      "Automotive Engineer",
      "Data Engineer",
    ],
    rounds: [
      {
        id: "aptitude",
        number: 1,
        title: "Aptitude & Core Tech Fundamentals",
        shortTitle: "Aptitude",
        type: "ASSESSMENT",
        description:
          "Numerical ability, logic puzzles, and core engineering fundamentals.",
        duration: "35 MIN",
        levels: 2,
        status: "available",
      },
      {
        id: "technical",
        number: 2,
        title: "Embedded Systems & Automotive Protocols",
        shortTitle: "Technical",
        type: "ASSESSMENT",
        description:
          "CAN protocol, microcontrollers, RTOS concepts, and C programming.",
        duration: "45 MIN",
        levels: 2,
        status: "locked",
      },
      {
        id: "coding",
        number: 3,
        title: "Coding & Logic Round",
        shortTitle: "Coding",
        type: "CODING",
        description:
          "Pointers, bit manipulation, array handling, and data structure algorithms.",
        duration: "45 MIN",
        levels: 2,
        status: "locked",
      },
      {
        id: "interview",
        number: 4,
        title: "Technical Interview",
        shortTitle: "Tech Round",
        type: "INTERVIEW",
        description:
          "Microcontroller architecture, project details, and real-time debugging.",
        duration: "30 MIN",
        levels: 2,
        status: "locked",
      },
      {
        id: "hr",
        number: 5,
        title: "ENGVIVA AI Interview",
        shortTitle: "AI HR",
        type: "AI INTERVIEW",
        description:
          "Safety-critical design ethics, collaboration, and career goals.",
        duration: "30 MIN",
        levels: 30,
        status: "locked",
      },
    ],
  },

  qualcomm: {
    id: "qualcomm",
    name: "Qualcomm",
    domain: "qualcomm.com",
    category: "Semiconductor",
    description:
      "Wireless technology, embedded systems, AI and semiconductor engineering.",
    headquarters: "San Diego, California",
    color: "#3253DC",
    roles: [
      "Software Engineer",
      "Embedded Engineer",
      "Systems Engineer",
      "AI Engineer",
    ],
    rounds: [
      {
        id: "aptitude",
        number: 1,
        title: "Aptitude & Digital Communications",
        shortTitle: "Aptitude",
        type: "ASSESSMENT",
        description:
          "Quantitative aptitude, signals, probability, and digital logic.",
        duration: "40 MIN",
        levels: 2,
        status: "available",
      },
      {
        id: "technical",
        number: 2,
        title: "C / C++ & OS Internals",
        shortTitle: "Technical",
        type: "ASSESSMENT",
        description:
          "Virtual memory, kernel synchronization, multi-threading, and computer networks.",
        duration: "45 MIN",
        levels: 2,
        status: "locked",
      },
      {
        id: "coding",
        number: 3,
        title: "Low-Level & Algorithm Coding",
        shortTitle: "Coding",
        type: "CODING",
        description:
          "Advanced C/C++ coding, memory allocators, bit tricks, and data structures.",
        duration: "60 MIN",
        levels: 2,
        status: "locked",
      },
      {
        id: "interview",
        number: 4,
        title: "Systems Technical Interview",
        shortTitle: "Tech Round",
        type: "INTERVIEW",
        description:
          "Embedded hardware-software interface, kernel modules, and live whiteboard coding.",
        duration: "45 MIN",
        levels: 2,
        status: "locked",
      },
      {
        id: "hr",
        number: 5,
        title: "ENGVIVA AI Interview",
        shortTitle: "AI HR",
        type: "AI INTERVIEW",
        description:
          "Innovator mindset, communication, and engineering discipline.",
        duration: "30 MIN",
        levels: 30,
        status: "locked",
      },
    ],
  },

  amd: {
    id: "amd",
    name: "AMD",
    domain: "amd.com",
    category: "Semiconductor",
    description:
      "Processors, GPUs, systems and high-performance computing.",
    headquarters: "Santa Clara, California",
    color: "#ED1C24",
    roles: [
      "Software Engineer",
      "Systems Engineer",
      "AI Engineer",
      "Embedded Engineer",
    ],
    rounds: [
      {
        id: "aptitude",
        number: 1,
        title: "Aptitude & Computer Architecture",
        shortTitle: "Aptitude",
        type: "ASSESSMENT",
        description:
          "Logic reasoning, processor pipelines, cache systems, and binary math.",
        duration: "40 MIN",
        levels: 2,
        status: "available",
      },
      {
        id: "technical",
        number: 2,
        title: "Systems, C++ & Concurrency",
        shortTitle: "Technical",
        type: "ASSESSMENT",
        description:
          "Parallel programming, memory models, compilers, and driver architectures.",
        duration: "45 MIN",
        levels: 2,
        status: "locked",
      },
      {
        id: "coding",
        number: 3,
        title: "High Performance Coding Round",
        shortTitle: "Coding",
        type: "CODING",
        description:
          "Optimized data structure implementation in C/C++ with runtime constraints.",
        duration: "60 MIN",
        levels: 2,
        status: "locked",
      },
      {
        id: "interview",
        number: 4,
        title: "Technical Architecture Interview",
        shortTitle: "Tech Round",
        type: "INTERVIEW",
        description:
          "GPU/CPU pipeline knowledge, firmware, and code optimization walkthrough.",
        duration: "45 MIN",
        levels: 2,
        status: "locked",
      },
      {
        id: "hr",
        number: 5,
        title: "ENGVIVA AI Interview",
        shortTitle: "AI HR",
        type: "AI INTERVIEW",
        description:
          "High-performance drive, resilience, and collaborative teamwork.",
        duration: "30 MIN",
        levels: 30,
        status: "locked",
      },
    ],
  },

  mckinsey: {
    id: "mckinsey",
    name: "McKinsey & Company",
    domain: "mckinsey.com",
    category: "Consulting",
    description: "Technology consulting, analytics and digital transformation.",
    headquarters: "New York, New York",
    color: "#1F1F1F",
    roles: [
      "Technology Analyst",
      "Data Engineer",
      "Software Engineer",
      "Data Scientist",
    ],
    rounds: [
      {
        id: "aptitude",
        number: 1,
        title: "Solve Game-Based Assessment (PSG)",
        shortTitle: "Solve Game",
        type: "ASSESSMENT",
        description:
          "Immersive problem solving simulation evaluating critical reasoning and decision making.",
        duration: "70 MIN",
        levels: 2,
        status: "available",
      },
      {
        id: "technical",
        number: 2,
        title: "Data Analytics & Digital Systems",
        shortTitle: "Technical",
        type: "ASSESSMENT",
        description:
          "SQL, data structures, data pipelines, and business technology architectures.",
        duration: "45 MIN",
        levels: 2,
        status: "locked",
      },
      {
        id: "coding",
        number: 3,
        title: "Technical Coding Round",
        shortTitle: "Coding",
        type: "CODING",
        description:
          "Algorithms and structured data manipulation in Python/R/Java.",
        duration: "45 MIN",
        levels: 2,
        status: "locked",
      },
      {
        id: "interview",
        number: 4,
        title: "Technical Case Interview",
        shortTitle: "Case Tech",
        type: "INTERVIEW",
        description:
          "Structured technology problem solving, enterprise digital transformation cases.",
        duration: "45 MIN",
        levels: 2,
        status: "locked",
      },
      {
        id: "hr",
        number: 5,
        title: "ENGVIVA AI Interview",
        shortTitle: "AI PEI",
        type: "AI INTERVIEW",
        description:
          "Personal Experience Interview (PEI): leadership, inclusive leadership, and entrepreneurial drive.",
        duration: "30 MIN",
        levels: 30,
        status: "locked",
      },
    ],
  },

  pwc: {
    id: "pwc",
    name: "PwC",
    domain: "pwc.com",
    category: "Consulting",
    description:
      "Technology consulting, cybersecurity, analytics and enterprise systems.",
    headquarters: "London, United Kingdom",
    color: "#D04A02",
    roles: [
      "Technology Consultant",
      "Software Engineer",
      "Data Analyst",
      "Cybersecurity Engineer",
    ],
    rounds: [
      {
        id: "aptitude",
        number: 1,
        title: "Aptitude & Numerical Reasoning",
        shortTitle: "Aptitude",
        type: "ASSESSMENT",
        description:
          "Numerical interpretation, abstract reasoning, and situational judgment.",
        duration: "35 MIN",
        levels: 2,
        status: "available",
      },
      {
        id: "technical",
        number: 2,
        title: "Technical Domain Assessment",
        shortTitle: "Technical",
        type: "ASSESSMENT",
        description:
          "Database queries, cybersecurity principles, and enterprise tech architecture.",
        duration: "45 MIN",
        levels: 2,
        status: "locked",
      },
      {
        id: "coding",
        number: 3,
        title: "Applied Coding Round",
        shortTitle: "Coding",
        type: "CODING",
        description:
          "Fundamental algorithmic logic and structured data parsing.",
        duration: "45 MIN",
        levels: 2,
        status: "locked",
      },
      {
        id: "interview",
        number: 4,
        title: "Technical & Case Study Interview",
        shortTitle: "Case Round",
        type: "INTERVIEW",
        description:
          "Technical evaluation, project architecture review, and business cases.",
        duration: "30 MIN",
        levels: 2,
        status: "locked",
      },
      {
        id: "hr",
        number: 5,
        title: "ENGVIVA AI Interview",
        shortTitle: "AI HR",
        type: "AI INTERVIEW",
        description:
          "PwC Professional Framework: leadership, relationship building, and business acumen.",
        duration: "30 MIN",
        levels: 30,
        status: "locked",
      },
    ],
  },

  pitti: {
    id: "pitti",
    name: "Pitti Engineering",
    domain: "pitti.in",
    category: "Manufacturing",
    description:
      "India's largest manufacturer of electrical steel laminations, motor cores, sub-assemblies, die-cast rotors, and high-precision machined components.",
    headquarters: "Hyderabad, India",
    color: "#D04A02",
    roles: [
      "Mechanical Engineer",
      "Production Engineer",
      "CNC Machinist",
      "Quality Control Inspector",
    ],
    rounds: [
      {
        id: "aptitude",
        number: 1,
        title: "General Aptitude & Reasoning",
        shortTitle: "Aptitude",
        type: "ASSESSMENT",
        description:
          "Quantitative aptitude, spatial reasoning, and mechanical logic.",
        duration: "30 MIN",
        levels: 2,
        status: "available",
      },
      {
        id: "technical",
        number: 2,
        title: "Engineering Fundamentals & Metrology",
        shortTitle: "Core Tech",
        type: "ASSESSMENT",
        description:
          "Manufacturing processes, GD&T, material science, and CNC programming fundamentals.",
        duration: "45 MIN",
        levels: 2,
        status: "locked",
      },
      {
        id: "coding",
        number: 3,
        title: "Industrial & Quality Assessment",
        shortTitle: "Industrial Test",
        type: "ASSESSMENT",
        description:
          "Quality standards (ISO, Six Sigma), machining parameters, and tolerance analysis.",
        duration: "45 MIN",
        levels: 2,
        status: "locked",
      },
      {
        id: "interview",
        number: 4,
        title: "Technical & Domain Interview",
        shortTitle: "Tech Interview",
        type: "INTERVIEW",
        description:
          "Discussion on manufacturing techniques, equipment operation, and plant floor case studies.",
        duration: "30 MIN",
        levels: 2,
        status: "locked",
      },
      {
        id: "hr",
        number: 5,
        title: "ENGVIVA AI Interview",
        shortTitle: "AI HR",
        type: "AI INTERVIEW",
        description:
          "Workplace safety adherence, industrial ethics, and operational leadership.",
        duration: "30 MIN",
        levels: 30,
        status: "locked",
      },
    ],
  },
};
/* =========================================================
   ICONS
========================================================= */

function ArrowIcon() {
  return (
    <svg
      width="17"
      height="17"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
    >
      <path d="M5 12h14" />
      <path d="m13 6 6 6-6 6" />
    </svg>
  );
}

function BackIcon() {
  return (
    <svg
      width="17"
      height="17"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
    >
      <path d="M19 12H5" />
      <path d="m11 18-6-6 6-6" />
    </svg>
  );
}

/* =========================================================
   LOGO
========================================================= */

function CompanyLogo({ company }) {
  const [failed, setFailed] =
    useState(false);

  const initials =
    company.name
      .split(" ")
      .map((x) => x[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();

  return (
    <div className="details-logo">
      {!failed ? (
        <img
          src={`https://www.google.com/s2/favicons?domain=${company.domain}&sz=256`}
          alt=""
          onError={() =>
            setFailed(true)
          }
        />
      ) : (
        <span>{initials}</span>
      )}
    </div>
  );
}

/* =========================================================
   ROUND ICON
========================================================= */

function RoundIcon({ type }) {
  const icon =
    type === "CODING"
      ? "</>"
      : type === "INTERVIEW"
      ? "◉"
      : type === "AI INTERVIEW"
      ? "AI"
      : "01";

  return (
    <div className="round-icon">
      {icon}
    </div>
  );
}

/* =========================================================
   ROADMAP NODE
========================================================= */

function RoadmapNode({
  round,
  index,
  selected,
  onSelect,
}) {
  const isAvailable =
    round.status ===
      "available" ||
    index === 0;

  return (
    <button
      type="button"
      className={`roadmap-node ${
        selected
          ? "selected"
          : ""
      } ${
        !isAvailable
          ? "locked"
          : ""
      }`}
      onClick={() =>
        onSelect(round)
      }
    >
      <div className="roadmap-number">
        {String(
          round.number
        ).padStart(2, "0")}
      </div>

      <div className="roadmap-node-content">
        <span className="roadmap-type">
          {round.type}
        </span>

        <strong>
          {round.shortTitle ||
            round.title}
        </strong>

        <small>
          {round.duration}
          {" · "}
          {round.levels} LEVELS
        </small>
      </div>

      <div className="roadmap-node-state">
        {isAvailable
          ? "→"
          : "LOCK"}
      </div>
    </button>
  );
}

/* =========================================================
   MAIN
========================================================= */

export default function CompanyDetails() {
  const {
    companyId,
  } = useParams();

  const navigate =
    useNavigate();

  const [
    company,
    setCompany,
  ] = useState(
    FALLBACK_COMPANIES[
      companyId
    ] || null
  );

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    selectedRole,
    setSelectedRole,
  ] = useState("");

  const [
    selectedRound,
    setSelectedRound,
  ] = useState(null);

  const [
    backendConnected,
    setBackendConnected,
  ] = useState(false);

  /* =======================================================
     FETCH COMPANY
  ======================================================= */

  useEffect(() => {
    fetchCompany();
  }, [companyId]);

  async function fetchCompany() {
    try {
      setLoading(true);

      const user =
        auth.currentUser;

      const headers = {};

      if (user) {
        const token =
          await user.getIdToken();

        headers.Authorization =
          `Bearer ${token}`;
      }

      const response =
        await fetch(
          `${API_BASE}/api/companies/${companyId}`,
          {
            headers,
          }
        );

      if (!response.ok) {
        throw new Error(
          "Company not found"
        );
      }

      const result =
        await response.json();

      const remoteCompany =
        result.company ||
        result.data ||
        result;

      if (
        remoteCompany &&
        remoteCompany.id
      ) {
        setCompany(
          remoteCompany
        );

        setBackendConnected(
          true
        );
      }
    } catch (error) {
      console.warn(
        "[ENGVIVA] Using fallback company intelligence.",
        error
      );

      const fallback =
        FALLBACK_COMPANIES[
          companyId
        ];

      setCompany(
        fallback || null
      );
    } finally {
      setLoading(false);
    }
  }

  /* =======================================================
     ROLE
  ======================================================= */

  useEffect(() => {
    if (
      company?.roles?.length &&
      !selectedRole
    ) {
      setSelectedRole(
        company.roles[0]
      );
    }
  }, [
    company,
    selectedRole,
  ]);

  /* =======================================================
     SELECT FIRST ROUND
  ======================================================= */

  useEffect(() => {
    if (
      company?.rounds?.length &&
      !selectedRound
    ) {
      setSelectedRound(
        company.rounds[0]
      );
    }
  }, [
    company,
    selectedRound,
  ]);

  const roadmap =
    useMemo(() => {
      return (
        company?.rounds || []
      );
    }, [company]);

  /* =======================================================
     START PREPARATION
  ======================================================= */

  function startPreparation() {
    if (!company) return;

  navigate(
  `/role-preparation?company=${companyId}&role=${encodeURIComponent(
    selectedRole
  )}`
);
  }

  /* =======================================================
     LOADING
  ======================================================= */

  if (loading) {
    return (
      <div className="details-page loading-page">
        <div className="loading-ring" />

        <span>
          LOADING COMPANY INTELLIGENCE
        </span>

        <style>{styles}</style>
      </div>
    );
  }

  /* =======================================================
     NOT FOUND
  ======================================================= */

  if (!company) {
    return (
      <div className="details-page not-found">
        <style>{styles}</style>

        <div className="not-found-box">
          <span>404</span>

          <h1>
            Company not found.
          </h1>

          <button
            onClick={() =>
              navigate(
                "/companies"
              )
            }
          >
            RETURN TO COMPANIES
          </button>
        </div>
      </div>
    );
  }

  /* =======================================================
     RENDER
  ======================================================= */

  return (
    <div className="details-page">
      <style>{styles}</style>

      <div className="details-orb orb-a" />
      <div className="details-orb orb-b" />
      <div className="details-grid" />

      <main className="details-shell">

        {/* =================================================
            TOP NAV
        ================================================= */}

        <header className="details-topbar">

          <button
            className="back-button"
            onClick={() =>
              navigate(
                "/companies"
              )
            }
          >
            <BackIcon />

            <span>
              COMPANIES
            </span>
          </button>

          <div className="company-system-status">

            <span
              className={
                backendConnected
                  ? "online-dot"
                  : "local-dot"
              }
            />

            {backendConnected
              ? "LIVE COMPANY INTELLIGENCE"
              : "COMPANY INTELLIGENCE"}

          </div>

        </header>

        {/* =================================================
            HERO
        ================================================= */}

        <section className="company-hero">

          <div className="hero-left">

            <div className="company-identity">

              <CompanyLogo
                company={company}
              />

              <div>

                <span className="company-category">
                  {company.category}
                </span>

                <h1>
                  {company.name}
                </h1>

                <span className="company-domain">
                  {company.domain}
                </span>

              </div>

            </div>

            <p className="company-description">
              {company.description}
            </p>

            <div className="hero-meta">

              <div>
                <span>
                  HEADQUARTERS
                </span>

                <strong>
                  {company.headquarters ||
                    "Global"}
                </strong>
              </div>

              <div>
                <span>
                  ENGINEERING ROLES
                </span>

                <strong>
                  {company.roles?.length ||
                    0}
                </strong>
              </div>

              <div>
                <span>
                  RECRUITMENT STAGES
                </span>

                <strong>
                  {roadmap.length}
                </strong>
              </div>

            </div>

          </div>

          <div className="hero-intelligence">

            <div className="intelligence-label">
              ENGVIVA ANALYSIS
            </div>

            <div className="intelligence-score">
              <span>
                READINESS
              </span>

              <strong>
                00
              </strong>

              <small>
                %
              </small>
            </div>

            <div className="score-line">
              <span />
            </div>

            <p>
              Select your target role
              and complete the recruitment
              roadmap to generate your
              personalized readiness score.
            </p>

          </div>

        </section>

        {/* =================================================
            ROLE SELECTOR
        ================================================= */}

        <section className="role-section">

          <div className="section-heading">

            <div>
              <span>
                01 / TARGET
              </span>

              <h2>
                Choose your engineering role.
              </h2>
            </div>

            <p>
              Your selected role controls
              the assessments, questions,
              coding problems and AI interview.
            </p>

          </div>

          <div className="role-selector">

            {(
              company.roles ||
              []
            ).map(
              (role) => (
                <button
                  key={role}
                  type="button"
                  className={
                    selectedRole ===
                    role
                      ? "role-chip active"
                      : "role-chip"
                  }
                  onClick={() =>
                    setSelectedRole(
                      role
                    )
                  }
                >
                  <span>
                    {role}
                  </span>

                  {selectedRole ===
                    role && (
                    <b>✓</b>
                  )}
                </button>
              )
            )}

          </div>

        </section>

        {/* =================================================
            ROADMAP
        ================================================= */}

        <section className="roadmap-section">

          <div className="section-heading roadmap-heading">

            <div>
              <span>
                02 / RECRUITMENT ROADMAP
              </span>

              <h2>
                Your path to the final interview.
              </h2>
            </div>

            <div className="roadmap-caption">
              <span className="legend-dot" />
              COMPLETE EACH STAGE TO UNLOCK THE NEXT
            </div>

          </div>

          <div className="roadmap">

            <div className="road-line">
              <div className="road-line-progress" />
            </div>

            <div className="roadmap-list">

              {roadmap.map(
                (
                  round,
                  index
                ) => (
                  <RoadmapNode
                    key={
                      round.id ||
                      index
                    }
                    round={
                      round
                    }
                    index={
                      index
                    }
                    selected={
                      selectedRound?.id ===
                      round.id
                    }
                    onSelect={
                      setSelectedRound
                    }
                  />
                )
              )}

            </div>

          </div>

        </section>

        {/* =================================================
            ROUND DETAIL
        ================================================= */}

        {selectedRound && (
          <section className="round-detail">

            <div className="round-detail-icon">
              <RoundIcon
                type={
                  selectedRound.type
                }
              />
            </div>

            <div className="round-detail-copy">

              <span>
                ROUND{" "}
                {String(
                  selectedRound.number
                ).padStart(
                  2,
                  "0"
                )}{" "}
                /{" "}
                {
                  selectedRound.type
                }
              </span>

              <h3>
                {selectedRound.title}
              </h3>

              <p>
                {
                  selectedRound.description
                }
              </p>

              <div className="round-meta">

                <span>
                  ⏱{" "}
                  {
                    selectedRound.duration
                  }
                </span>

                <span>
                  ◈{" "}
                  {
                    selectedRound.levels
                  }{" "}
                  LEVELS
                </span>

                <span>
                  ROLE:{" "}
                  {selectedRole}
                </span>

              </div>

            </div>

            <button
              className="round-action"
              disabled={
                selectedRound.status ===
                "locked"
              }
            >
              {selectedRound.status ===
              "locked"
                ? "LOCKED"
                : "VIEW ROUND"}

              <ArrowIcon />
            </button>

          </section>
        )}

        {/* =================================================
            PREPARATION CTA
        ================================================= */}

        <section className="preparation-cta">

          <div className="cta-glow" />

          <div className="cta-copy">

            <span>
              READY TO ENTER THE SIMULATION?
            </span>

            <h2>
              Prepare for{" "}
              <em>
                {selectedRole}
              </em>
              .
            </h2>

            <p>
              ENGVIVA will build your
              preparation path around this
              company and role.
            </p>

          </div>

          <button
            className="start-button"
            onClick={
              startPreparation
            }
          >
            <span>
              START PREPARATION
            </span>

            <ArrowIcon />
          </button>

        </section>

        {/* =================================================
            FOOTER
        ================================================= */}

        <footer className="details-footer">

          <span>
            ENGVIVA / COMPANY INTELLIGENCE
          </span>

          <span>
            ROLE-AWARE · ROUND-AWARE · ADAPTIVE
          </span>

        </footer>

      </main>
    </div>
  );
}

/* =========================================================
   STYLES
========================================================= */

const styles = `
* {
  box-sizing: border-box;
}

.details-page {
  min-height: 100vh;

  position: relative;

  overflow-x: hidden;

  color: #eee9f7;

  background:
    radial-gradient(
      circle at 72% 10%,
      rgba(143,105,239,.12),
      transparent 28%
    ),
    radial-gradient(
      circle at 8% 65%,
      rgba(93,55,173,.07),
      transparent 28%
    ),
    #07070c;

  font-family:
    Inter,
    system-ui,
    -apple-system,
    BlinkMacSystemFont,
    "Segoe UI",
    sans-serif;
}

/* =========================================================
   BACKGROUND
========================================================= */

.details-grid {
  position: fixed;
  inset: 0;

  pointer-events: none;

  opacity: .025;

  background-image:
    linear-gradient(
      rgba(190,170,255,.3) 1px,
      transparent 1px
    ),
    linear-gradient(
      90deg,
      rgba(190,170,255,.3) 1px,
      transparent 1px
    );

  background-size:
    70px 70px;

  mask-image:
    linear-gradient(
      to bottom,
      black,
      transparent 80%
    );
}

.details-orb {
  position: fixed;

  width: 420px;
  height: 420px;

  border-radius: 50%;

  filter: blur(130px);

  opacity: .09;

  pointer-events: none;

  animation:
    floatDetails
    12s
    ease-in-out
    infinite alternate;
}

.orb-a {
  right: -180px;
  top: 80px;

  background: #a27bff;
}

.orb-b {
  left: -230px;
  bottom: -130px;

  background: #5632a7;

  animation-delay: -4s;
}

.details-shell {
  position: relative;

  z-index: 2;

  width:
    min(
      1360px,
      calc(100% - 56px)
    );

  margin: auto;

  padding:
    32px 0 65px;
}

/* =========================================================
   TOPBAR
========================================================= */

.details-topbar {
  height: 45px;

  display: flex;

  align-items: center;

  justify-content:
    space-between;

  margin-bottom: 35px;
}

.back-button {
  display: flex;

  align-items: center;

  gap: 9px;

  border: 0;

  color: #777080;

  background: transparent;

  cursor: pointer;

  font-size: 7px;

  letter-spacing: 1.7px;

  transition: .25s ease;
}

.back-button:hover {
  color: #c2b4da;

  transform:
    translateX(-3px);
}

.company-system-status {
  display: flex;

  align-items: center;

  gap: 7px;

  color: #56505f;

  font-size: 6px;

  letter-spacing: 1.3px;
}

.online-dot,
.local-dot {
  width: 5px;
  height: 5px;

  border-radius: 50%;
}

.online-dot {
  background: #63dba5;

  box-shadow:
    0 0 10px
    rgba(99,219,165,.7);
}

.local-dot {
  background: #d49b58;

  box-shadow:
    0 0 10px
    rgba(212,155,88,.5);
}

/* =========================================================
   HERO
========================================================= */

.company-hero {
  display: grid;

  grid-template-columns:
    minmax(0, 1.7fr)
    minmax(310px, .7fr);

  gap: 25px;

  margin-bottom: 70px;
}

.hero-left,
.hero-intelligence {
  position: relative;

 border:
    1px solid
    rgba(82,227,164,.08);

  background:
    linear-gradient(
      145deg,
      rgba(255,255,255,.043),
      rgba(255,255,255,.014)
    );

  backdrop-filter:
    blur(28px);

  border-radius: 24px;
}

.hero-left {
  padding:
    35px 38px 32px;
}

.company-identity {
  display: flex;

  align-items: center;

  gap: 20px;
}

.details-logo {
  width: 82px;
  height: 82px;

  display: grid;

  place-items: center;

  flex: 0 0 auto;

  border:
    1px solid
    rgba(189,165,242,.15);

  border-radius: 21px;

  background:
    rgba(255,255,255,.045);

  box-shadow:
    inset 0 1px
    rgba(255,255,255,.08),

    0 20px 50px
    rgba(0,0,0,.18);
}

.details-logo img {
  width: 50px;
  height: 50px;

  object-fit: contain;
}

.details-logo span {
  color: #d4c8ea;

  font-size: 22px;

  font-weight: 800;
}

.company-category {
  color: #9c82d2;

  font-size: 7px;

  letter-spacing: 2px;

  font-weight: 800;
}

.company-identity h1 {
  margin:
    5px 0 4px;

  color: #eeeaf6;

  font-size:
    clamp(
      38px,
      5vw,
      67px
    );

  line-height: .95;

  letter-spacing:
    -3px;
}

.company-domain {
  color: #5f5967;

  font-size: 8px;
}

.company-description {
  max-width: 720px;

  margin:
    32px 0 28px;

  color: #777080;

  font-size: 10px;

  line-height: 1.85;
}

.hero-meta {
  display: flex;

  gap: 0;

  border-top:
    1px solid
    rgba(189,165,242,.07);

  padding-top: 20px;
}

.hero-meta > div {
  min-width: 150px;

  padding-right: 30px;

  margin-right: 30px;

  border-right:
    1px solid
    rgba(189,165,242,.07);
}

.hero-meta > div:last-child {
  border-right: 0;
}

.hero-meta span {
  display: block;

  color: #514b59;

  font-size: 6px;

  letter-spacing: 1.3px;

  margin-bottom: 6px;
}

.hero-meta strong {
  color: #aaa0b9;

  font-size: 9px;

  font-weight: 500;
}

/* =========================================================
   INTELLIGENCE
========================================================= */

.hero-intelligence {
  padding: 30px;

  overflow: hidden;
}

.hero-intelligence::after {
  content: "";

  position: absolute;

  width: 240px;
  height: 240px;

  right: -130px;
  top: -120px;

  border-radius: 50%;

  background:
    radial-gradient(
      circle,
      rgba(164,130,255,.13),
      transparent 70%
    );
}

.intelligence-label {
  color: #6d637b;

  font-size: 6px;

  letter-spacing: 1.8px;

  font-weight: 800;
}

.intelligence-score {
  display: flex;

  align-items:
    baseline;

  gap: 4px;

  margin-top: 55px;
}

.intelligence-score span {
  color: #665e6d;

  font-size: 7px;

  letter-spacing: 1px;
}

.intelligence-score strong {
  color: #c9b8e8;

  font-size: 74px;

  font-weight: 300;

  letter-spacing: -5px;
}

.intelligence-score small {
  color: #9a82c9;

  font-size: 17px;
}

.score-line {
  width: 100%;
  height: 2px;

  overflow: hidden;

  margin:
    12px 0 18px;

  background:
    rgba(185,159,239,.07);
}

.score-line span {
  display: block;

  width: 0%;

  height: 100%;

  background:
    linear-gradient(
      90deg,
      #8060ca,
      #c2a9ff
    );
}

.hero-intelligence p {
  color: #625b69;

  font-size: 8px;

  line-height: 1.8;
}

/* =========================================================
   SECTION HEADINGS
========================================================= */

.section-heading {
  display: flex;

  align-items: flex-end;

  justify-content:
    space-between;

  gap: 30px;

  margin-bottom: 23px;
}

.section-heading > div:first-child
span {
  color: #9178bf;

  font-size: 6px;

  letter-spacing: 1.8px;

  font-weight: 800;
}

.section-heading h2 {
  margin:
    8px 0 0;

  color: #ddd6ea;

  font-size: 23px;

  letter-spacing: -.7px;

  font-weight: 500;
}

.section-heading > p {
  max-width: 380px;

  margin: 0;

  color: #5f5967;

  font-size: 8px;

  line-height: 1.7;

  text-align: right;
}

/* =========================================================
   ROLE SECTION
========================================================= */

.role-section {
  margin-bottom: 75px;
}

.role-selector {
  display: flex;

  flex-wrap: wrap;

  gap: 8px;
}

.role-chip {
  position: relative;

  padding:
    12px 15px;

  border:
    1px solid
    rgba(183,158,236,.075);

  border-radius: 11px;

  color: #777080;

  background:
    rgba(255,255,255,.025);

  cursor: pointer;

  font-size: 8px;

  transition:
    .25s ease;
}

.role-chip:hover {
  color: #b9abd0;

  border-color:
    rgba(183,158,236,.2);
}

.role-chip.active {
  color: #d5c8ec;

  border-color:
    rgba(179,148,241,.35);

  background:
    linear-gradient(
      135deg,
      rgba(150,113,231,.13),
      rgba(150,113,231,.045)
    );

  box-shadow:
    0 10px 35px
    rgba(103,70,170,.09);
}

.role-chip b {
  margin-left: 8px;

  color: #a990dc;

  font-size: 8px;
}

/* =========================================================
   ROADMAP
========================================================= */

.roadmap-section {
  margin-bottom: 35px;
}

.roadmap-heading {
  margin-bottom: 30px;
}

.roadmap-caption {
  display: flex;

  align-items: center;

  gap: 8px;

  color: #4e4956;

  font-size: 6px;

  letter-spacing: 1px;
}

.legend-dot {
  width: 5px;
  height: 5px;

  border-radius: 50%;

  background: #9b7be1;

  box-shadow:
    0 0 10px
    rgba(155,123,225,.7);
}

.roadmap {
  position: relative;

  padding:
    15px 0 15px;
}

.road-line {
  position: absolute;

  top: 50%;

  left: 7%;

  right: 7%;

  height: 1px;

  background:
    rgba(183,158,236,.07);

  transform:
    translateY(-50%);
}

.road-line-progress {
  width: 0%;

  height: 100%;

  background:
    linear-gradient(
      90deg,
      #7151b3,
      #ad8ced
    );

  box-shadow:
    0 0 15px
    rgba(161,126,239,.5);

  animation:
    roadmapProgress
    2.4s
    ease-out
    forwards;
}

.roadmap-list {
  position: relative;

  display: grid;

  grid-template-columns:
    repeat(
      5,
      minmax(0, 1fr)
    );

  gap: 12px;
}

.roadmap-node {
  position: relative;

  min-height: 140px;

  padding:
    17px;

  text-align: left;

  border:
    1px solid
    rgba(183,158,236,.075);

  border-radius: 17px;

  color: inherit;

  background:
    rgba(255,255,255,.025);

  backdrop-filter:
    blur(18px);

  cursor: pointer;

  transition:
    transform .35s
      cubic-bezier(.2,.8,.2,1),
    border-color .3s ease,
    background .3s ease,
    box-shadow .3s ease;
}

.roadmap-node:hover {
  transform:
    translateY(-5px);

  border-color:
    rgba(177,146,239,.2);

  background:
    rgba(161,126,239,.045);
}

.roadmap-node.selected {
  border-color:
    rgba(177,146,239,.35);

  background:
    linear-gradient(
      145deg,
      rgba(154,116,231,.09),
      rgba(255,255,255,.025)
    );

  box-shadow:
    0 15px 45px
    rgba(89,60,152,.1);
}

.roadmap-node.locked {
  opacity: .55;
}

.roadmap-number {
  color: #8c72b9;

  font-size: 7px;

  letter-spacing: 1.5px;

  font-weight: 800;
}

.roadmap-node-content {
  margin-top: 24px;
}

.roadmap-type {
  display: block;

  color: #524c5b;

  font-size: 5.5px;

  letter-spacing: 1.2px;

  margin-bottom: 7px;
}

.roadmap-node strong {
  display: block;

  color: #bdb4ca;

  font-size: 11px;

  line-height: 1.35;

  font-weight: 500;
}

.roadmap-node small {
  display: block;

  margin-top: 8px;

  color: #55505c;

  font-size: 6px;
}

.roadmap-node-state {
  position: absolute;

  right: 13px;
  top: 13px;

  color: #6b6179;

  font-size: 9px;
}

/* =========================================================
   ROUND DETAIL
========================================================= */

.round-detail {
  display: grid;

  grid-template-columns:
    auto 1fr auto;

  align-items: center;

  gap: 23px;

  padding:
    25px 27px;

  margin-bottom: 65px;

  border:
    1px solid
    rgba(183,158,236,.085);

  border-radius: 19px;

  background:
    rgba(255,255,255,.025);

  backdrop-filter:
    blur(25px);
}

.round-detail-icon {
  width: 56px;
  height: 56px;

  display: grid;

  place-items: center;

  border:
    1px solid
    rgba(183,158,236,.13);

  border-radius: 15px;

  color: #ad93dc;

  background:
    rgba(154,116,231,.06);

  font-size: 10px;

  font-weight: 700;
}

.round-detail-copy > span {
  color: #8066aa;

  font-size: 6px;

  letter-spacing: 1.4px;
}

.round-detail-copy h3 {
  margin:
    6px 0 5px;

  color: #d7d0e3;

  font-size: 17px;

  font-weight: 500;
}

.round-detail-copy p {
  margin: 0;

  color: #67606f;

  font-size: 8px;
}

.round-meta {
  display: flex;

  gap: 14px;

  margin-top: 10px;
}

.round-meta span {
  color: #55505c;

  font-size: 6px;
}

.round-action {
  display: flex;

  align-items: center;

  gap: 12px;

  padding:
    11px 14px;

  border:
    1px solid
    rgba(177,146,239,.12);

  border-radius: 9px;

  color: #aa97c8;

  background:
    rgba(161,126,239,.045);

  cursor: pointer;

  font-size: 6px;

  letter-spacing: 1px;
}

.round-action:disabled {
  cursor: not-allowed;

  color: #4f4a55;

  border-color:
    rgba(183,158,236,.05);

  background:
    rgba(255,255,255,.015);
}

/* =========================================================
   CTA
========================================================= */

.preparation-cta {
  position: relative;

  display: flex;

  align-items: center;

  justify-content:
    space-between;

  gap: 30px;

  padding:
    31px 35px;

  overflow: hidden;

  border:
    1px solid
    rgba(178,148,241,.12);

  border-radius: 21px;

  background:
    linear-gradient(
      110deg,
      rgba(132,94,207,.075),
      rgba(255,255,255,.022)
    );
}

.cta-glow {
  position: absolute;

  width: 280px;
  height: 280px;

  right: 8%;

  top: -200px;

  border-radius: 50%;

  background:
    #9670ed;

  filter: blur(100px);

  opacity: .08;

  pointer-events: none;
}

.cta-copy {
  position: relative;
  z-index: 1;
}

.cta-copy > span {
  color: #8068a9;

  font-size: 6px;

  letter-spacing: 1.8px;

  font-weight: 800;
}

.cta-copy h2 {
  margin:
    8px 0 7px;

  color: #d8d1e5;

  font-size: 25px;

  font-weight: 400;
}

.cta-copy h2 em {
  color: #aa91dd;

  font-style: normal;
}

.cta-copy p {
  margin: 0;

  color: #625b69;

  font-size: 8px;
}

.start-button {
  position: relative;

  z-index: 1;

  display: flex;

  align-items: center;

  gap: 20px;

  padding:
    14px 18px 14px 21px;

  border:
    1px solid
    rgba(207,188,255,.2);

  border-radius: 10px;

  color: #eee9f7;

  background:
    linear-gradient(
      135deg,
      rgba(140,103,216,.7),
      rgba(164,133,239,.45)
    );

  box-shadow:
    0 12px 40px
    rgba(106,72,173,.16),

    inset 0 1px
    rgba(255,255,255,.12);

  cursor: pointer;

  font-size: 7px;

  letter-spacing: 1.5px;

  font-weight: 700;

  transition:
    transform .3s ease,
    box-shadow .3s ease,
    border-color .3s ease;
}

.start-button:hover {
  transform:
    translateY(-3px);

  border-color:
    rgba(215,197,255,.45);

  box-shadow:
    0 18px 55px
    rgba(110,73,182,.28);
}

/* =========================================================
   FOOTER
========================================================= */

.details-footer {
  display: flex;

  justify-content:
    space-between;

  margin-top: 45px;

  padding-top: 18px;

  border-top:
    1px solid
    rgba(183,158,236,.05);

  color: #3f3a46;

  font-size: 5.5px;

  letter-spacing: 1.4px;
}

/* =========================================================
   LOADING / NOT FOUND
========================================================= */

.loading-page,
.not-found {
  display: grid;

  place-items: center;

  min-height: 100vh;
}

.loading-page {
  gap: 15px;

  color: #5f5968;

  font-size: 7px;

  letter-spacing: 1.5px;
}

.loading-ring {
  width: 38px;
  height: 38px;

  border:
    1px solid
    rgba(178,148,241,.12);

  border-top-color:
    #a58be0;

  border-radius: 50%;

  animation:
    spin .8s
    linear infinite;
}

.not-found-box {
  text-align: center;
}

.not-found-box > span {
  color: #8e72bd;

  font-size: 60px;

  font-weight: 300;
}

.not-found-box h1 {
  color: #c5bbd3;

  font-size: 20px;
}

.not-found-box button {
  padding:
    11px 15px;

  border:
    1px solid
    rgba(178,148,241,.15);

  border-radius: 9px;

  color: #a995c6;

  background:
    rgba(161,126,239,.05);

  cursor: pointer;

  font-size: 7px;

  letter-spacing: 1px;
}

/* =========================================================
   ANIMATION
========================================================= */

@keyframes roadmapProgress {
  from {
    width: 0%;
  }

  to {
    width: 15%;
  }
}

@keyframes floatDetails {
  from {
    transform:
      translate3d(
        -15px,
        0,
        0
      );
  }

  to {
    transform:
      translate3d(
        20px,
        -25px,
        0
      );
  }
}

@keyframes spin {
  to {
    transform:
      rotate(360deg);
  }
}

/* =========================================================
   RESPONSIVE
========================================================= */

@media (
  max-width: 1050px
) {
  .company-hero {
    grid-template-columns:
      1fr;
  }

  .hero-intelligence {
    min-height: 220px;
  }

  .roadmap-list {
    grid-template-columns:
      repeat(
        3,
        minmax(0, 1fr)
      );
  }

  .road-line {
    display: none;
  }
}

@media (
  max-width: 760px
) {
  .details-shell {
    width:
      calc(100% - 28px);

    padding-top: 20px;
  }

  .company-hero {
    margin-bottom: 50px;
  }

  .hero-left {
    padding: 25px;
  }

  .company-identity {
    align-items: flex-start;
  }

  .details-logo {
    width: 65px;
    height: 65px;
  }

  .company-identity h1 {
    font-size: 42px;
  }

  .hero-meta {
    flex-wrap: wrap;

    gap: 18px;
  }

  .hero-meta > div {
    border-right: 0;

    margin-right: 0;

    padding-right: 0;
  }

  .roadmap-list {
    grid-template-columns:
      1fr;
  }

  .round-detail {
    grid-template-columns:
      auto 1fr;
  }

  .round-action {
    grid-column: 1 / -1;

    justify-content: center;
  }

  .preparation-cta {
    flex-direction: column;

    align-items: flex-start;
  }

  .start-button {
    width: 100%;

    justify-content: center;
  }

  .details-footer {
    flex-direction: column;

    gap: 9px;
  }
}

@media (
  max-width: 480px
) {
  .company-identity {
    flex-direction: column;
  }

  .company-identity h1 {
    font-size: 37px;
  }

  .section-heading {
    flex-direction: column;

    align-items: flex-start;
  }

  .section-heading > p {
    text-align: left;
  }

  .roadmap-heading {
    gap: 12px;
  }

  .round-meta {
    flex-wrap: wrap;
  }
}
`;
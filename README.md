[![License](https://img.shields.io/badge/License-Apache2-blue.svg)](https://www.apache.org/licenses/LICENSE-2.0)
[![Community](https://img.shields.io/badge/join-Call%20For%20Code%20Community-blue)](https://developer.ibm.com/callforcode/solutions/projects/get-started/)
<h1 align="center"<a name="title"></a>WhisperNet</h1>
<div align="center">
  
>  **Speak without speaking. Help without delay.**  
> WhisperNet connects victims, responders, and loved ones — even when words aren’t possible.


</div>
<h1 align="center"</a></h1>

  - [Project Summary](#project-summary)
      - [The issue we are hoping to solve](#issue-we-are-solving)
      - [Our Idea](#our-idea)
      - [Target User](#target-user)
      - [Agentic AI and WatsonX in WhisperNet](#watsonx-agents)
   
  - [Technology Implementation](#technology-implementation)
      - [Tech Stack](#tech-stack)
      - [Solution Architecture](#solution-architecture)
   
  - [Presentation materials](#presentation-materials)
      - [Solution Demo Video](#solution-demo-video)
     
  - [Additional Details](#additional-details)
      - [Alignment with the Theme: SDG 11 – Sustainable Cities and Communities](#theme-alignment)
      - [How to run the project](#run-the-project)
      - [Live Demo](#Live-Demo)
            
  - [About](#about)
      - [Authors](#Authors)
      - [License](#license)

<h2 align="center"> Project Summary <a name="project-summary"></a> </h2>

### The Issue we are hoping to solve <a name="issue-we-are-solving"></a>
During emergencies such as assaults, active shooter incidents, domestic violence, or medical crises, victims may be **unable to speak or make calls verbally** due to immediate danger, injury, or fear of escalation.  
Traditional SOS alerts (mobile apps, SMS, or panic buttons) have significant limitations:
- They send only a **one-time static alert** without live context.
- Emergency responders **cannot ask follow-up questions** in real time.
- Victims cannot **safely provide continuous updates** while hiding or staying silent.
- Contacted friends/family **receive minimal information** and cannot engage with the situation.

This lack of two-way, real-time, context-rich communication delays response times and may cost lives.

### Our Idea : WhisperNet <a name="our-idea"></a>

**WhisperNet** is an **agentic AI-powered, silent emergency communication system** that allows victims to have a **real-time, two-way conversation** with emergency responders **without speaking a single word**.

Key features:
- Victim communicates **silently** through minimal actions or typing.
- Emergency responders speak as usual — their voice is converted to text, processed by **WatsonX AI**, and answered **as if by the victim** using prior context.
- Two-stage SMS alerts to emergency contacts:
  1. **Stage 1** → Immediate alert + live chat link.
  2. **Stage 2** → AI-triggered, **only when enough details** (name, location, threat type) are confirmed.
- Emergency contacts can **chat with WatsonX AI** to understand the situation and ask:
  - Who is in danger?
  - What happened?
  - What should I do now?
- Works across **phone calls (via Twilio)**, **Supabase Edge Functions**, and **WatsonX Granite LLMs** for reasoning.

### Target Users <a name="target-user"></a>

1. **Victims in Emergencies** — unable to speak but need to communicate quickly and discreetly.
2. **Emergency Responders** — need situational awareness in real-time.
3. **Emergency Contacts** — friends/family who must be informed and guided.

**Example Use Cases:**
- Active shooter situations
- Domestic violence
- Kidnapping/abduction
- Medical emergencies when speaking is not possible
- Natural disasters where noise makes communication hard


### Agentic AI Workflow with IBM WatsonX <a name="watsonx-agents"></a>

WhisperNet uses **multiple autonomous agents**, each powered by IBM WatsonX Granite models.

**1. Responder Aid Agent**
- **Goal:** Acts as the victim’s voice in real time.
- **Input:**  
  - Responder’s spoken question (converted to text via IBM Speech-to-Text).
  - Past victim messages in the current session.
- **Processing:**  
  - WatsonX Granite Instruct model generates the **most likely victim response** based strictly on prior context if not enough context present then watsonx ai let user to answer by typing in the chat.
- **Output:** Spoken answer to the responder via Twilio + stored in conversation logs.


**2. Stage 2 Alert Agent**
- **Goal:** Decide when to escalate to full SMS alert with details.
- **Input:** Entire victim-responder conversation log.
- **Processing:**  
  - WatsonX AI checks for **3 mandatory details**:  
    1. Victim’s name  
    2. Type of threat  
    3. Location
  - If confirmed, generates **a concise AI-written summary**.
- **Output:** Sends Stage 2 SMS to emergency contacts with:
  - Summary of the situation.
  - Live chat link for ongoing updates.


**3. Emergency Contact Context Agent**
- **Goal:** Provide dynamic Q&A for emergency contacts.
- **Input:** Session ID + chat history of the emergency.
- **Processing:**  
  - WatsonX AI answers free-form questions from emergency contacts (“Where is the victim?”, “What happened?”, “What should I do?”).
- **Output:** Context-aware, AI-generated responses for friends/family.

<h2 align="center"> Technology Implementation <a name="technology-implementation"></a> </h2>

### Tech Stack Used <a name="tech-stack"></a>

1. **IBM WatsonX AI (Granite-3-8B Instruct)** → Multi-agent reasoning, summarization, and context inference.
2. **IBM Speech-to-Text** → Transcribes responder’s voice in real-time.
3. **Twilio Voice API** → Phone calls between victim & responder.
4. **Twilio Messaging API** → Emergency SMS alerts for the emergency contacts.
5. **Supabase Edge Functions** → Secure serverless AI & communication orchestration.
6. **Supabase Database** → Store sessions, messages, emergency contact info.

### Technical Architecture <a name="solution-architecture"></a>

![Solution Architecture](https://github.com/Ayanghosh-agno/WhisperNet-IBM/blob/main/public/whisperNetTechDesign.png)



<h2 align="center"> Presentation materials <a name="presentation-materials"></a> </h2>

### Solution Demo Video <a name="solution-demo-video"></a>

[![Solution Demo Video](https://github.com/Ayanghosh-agno/WhisperNet-IBM/blob/main/public/Demonstration-Video-Thumbnail.png)](https://www.youtube.com/)

<h2 align="center"> Additional Details <a name="additional-details"></a> </h2>

### Alignment with the Theme: SDG 11 – Sustainable Cities and Communities <a name="theme-alignment"></a>

WhisperNet directly supports **United Nations Sustainable Development Goal 11: Sustainable Cities and Communities** by making urban spaces **safer, more inclusive, and resilient** through **AI-powered silent emergency communication**.  

In modern cities, safety and rapid response are critical — especially in situations where victims cannot speak or make a loud SOS call. WhisperNet bridges this gap by enabling **silent, continuous, AI-assisted communication** between victims, emergency responders, and trusted contacts, ensuring timely intervention without escalating danger.  

By leveraging **IBM watsonx agentic AI**, WhisperNet:  
- **Reduces response time** through autonomous situation summarization and escalation.  
- **Improves accessibility** for individuals in vulnerable situations, including those with speech impairments.  
- **Operates in low-bandwidth environments**, making it effective during disasters or infrastructure outages.  

This approach not only **enhances real-time safety in cities** but also creates a scalable blueprint for **community-driven emergency networks**, aligning perfectly with SDG 11’s mission of making cities **safe, resilient, and sustainable**.


### How to run the project <a name="run-the-project"></a>


Step 1: Cloning of the repository :

Our first goal is to set up a developer project which we'll use to modify our application. It starts by cloning the repository. Use the command git clone 

```bash
git clone https://github.com/Ayanghosh-agno/WhisperNet-IBM.git
```

Step 2: Configure Environmental Variables :

- **Twilio** (SID, Auth Token, Voice settings)
- **Supabase** (Project URL, API Key)
- **IBM WatsonX** (API Key, Project ID)
- **IBM Speech-to-Text** (API Key, Endpoint)

Step 3: Deploy the Supabase edge functions manually.

Step 4: Start testing.
- Place a silent call to the Twilio number.
- Watch AI fill in missing info and update emergency contacts.


### Live Demo <a name="Live-Demo"></a>

We can see live working of **WhisperNet** - [Here](https://whispernet-ibm.netlify.app/)


<h2 align="center"> About <a name="about"></a> </h2>

### Author<a name="Authors"></a>

<img src="https://github.com/Ayanghosh-agno/WhisperNet-IBM/blob/main/public/Ayan%20Ghosh.png" style="max-width: 70px;">

   **Ayan Ghosh**

### License<a name="license"></a>
This project is licensed under the Apache 2 License - see the [LICENSE](LICENSE) file for details.


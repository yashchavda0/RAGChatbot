# Winning the Gemma 4 Good Hackathon: Five Research-Grade Project Blueprints

The **Gemma 4 Good Hackathon** ($200K prize pool, Kaggle × Google DeepMind, deadline May 18, 2026) rewards projects that deploy Gemma 4's multimodal reasoning at the edge to solve urgent problems for underserved communities. Analysis of winning patterns from the recent MedGemma Impact Challenge (850+ teams) reveals that every grand-prize winner combined **on-device deployment, domain fine-tuning, privacy-first architecture, and local-language support** — not just API wrappers. The five project ideas below each fuse two or more ML subfields (CV, NLP, multimodal, federated/edge), exploit Gemma 4–specific architectural innovations (variable-resolution SigLIP encoder, 128-expert MoE routing, Per-Layer Embeddings, native thinking mode), and target realistic demos achievable in six weeks by a research-capable team.

Gemma 4 launched April 2, 2026 with four variants under Apache 2.0: **E2B** (2.3B effective, text+image+audio), **E4B** (4.5B effective, text+image+audio), **26B A4B MoE** (3.8B active of 25.2B, text+image), and **31B Dense** (text+image, 256K context). The architecture introduces shared KV-cache, dual RoPE, QK-norm, and — critically for hackathon projects — a configurable vision token budget (70–1120 tokens per image) that lets developers trade resolution for latency on constrained hardware. Below are five project blueprints ranked by combined novelty × impact × feasibility.

---

## 1. FedDermScreen — federated skin disease screening across rural clinics

**Track:** Health & Sciences + Digital Equity | **ML Areas:** Federated + CV + Multimodal + Edge

### Core research innovation

Most dermatology AI systems centralize training on datasets dominated by lighter skin tones (Fitzpatrick I–III), producing well-documented diagnostic bias for darker-skinned populations. FedDermScreen formulates a **federated continual-learning** problem: distributed clinics each hold small, locally representative image sets (capturing their population's skin tone distribution), and collaboratively improve a shared model without transmitting patient images. The novel contribution is a **skin-tone-aware federated aggregation strategy** — each client's LoRA adapter update is weighted not just by dataset size but by an inverse-frequency signal derived from the Monk Skin Tone Scale distribution of its local data, so the global model preferentially absorbs knowledge from underrepresented skin tones. This directly addresses the FairFace/VLBiasBench finding that scaling data alone does not guarantee fairness. The evaluation metric combines **macro-averaged sensitivity across Monk skin tone deciles** alongside standard top-1 accuracy, creating a novel fairness-aware leaderboard.

### How Gemma 4 is specifically leveraged

Deploy **Gemma 4 E4B** as the edge inference model at each clinic. The SigLIP vision encoder's **variable token budget** is critical: set to 560 tokens for dermatology (high spatial detail needed for lesion morphology) while keeping total model memory under 3 GB with INT4 quantization. Use Gemma 4's **native thinking mode** (`<|think|>` token) to generate a structured diagnostic chain: lesion description → differential diagnosis → confidence calibration → referral recommendation. The **262K vocabulary** with 140+ language coverage enables clinical reasoning output in local languages (Swahili, Hindi, Yoruba) without a separate translation module. Fine-tune via **QLoRA** (rank-16, targeting q/k/v/o projections + vision encoder final layers) using the Flower framework's simulation engine on a single A100.

### Datasets

- **Fitzpatrick17k** (16,577 clinical images, 114 skin conditions, Fitzpatrick skin type labels) — primary training set
- **ISIC 2024** (dermoscopic images with melanoma labels) — secondary, for cancer-specific evaluation
- **PAD-UFES-20** (2,298 smartphone-captured skin lesion images from Brazil) — simulates realistic clinic capture quality
- **DDI** (Diverse Dermatology Images, Stanford, 2022) — 656 images with verified dark skin representation for fairness evaluation

### Demo interaction

A split-screen web app. **Left panel:** simulated clinic view where a healthcare worker photographs a skin lesion with a phone camera; the on-device Gemma 4 E4B processes the image and streams a thinking-mode diagnostic chain ("I observe a pigmented papule with irregular borders on Monk Tone 8 skin...differential includes melanoma, seborrheic keratosis...confidence: moderate, recommend biopsy"). **Right panel:** a federated training dashboard showing simulated clinics across three countries (Kenya, India, Brazil) collaboratively improving the model — a live fairness graph updates in real time showing macro-sensitivity converging across skin tone deciles as federated rounds complete. The demo uses Flower's simulation engine running 10 virtual clients with Fitzpatrick17k partitioned by skin type.

### Why it would win

This project hits every winning signal: **on-device** (E4B quantized), **privacy-first** (federated — no patient images leave the clinic), **fairness innovation** (skin-tone-aware aggregation is novel and directly addresses a known bias gap), **local language** (multilingual clinical output), and **real-world urgency** (skin cancer is the most common cancer globally yet AI screening tools perform worst on dark skin). The EpiCast grand-prize winner at MedGemma Impact Challenge succeeded with a similar formula — mobile-first, West Africa–focused, fine-tuned for local clinical patterns.

### Key ML challenges and technical solutions

| Challenge | Solution |
|-----------|----------|
| Non-IID data across clinics (different disease prevalence per region) | FedProx regularization (μ=0.01) + FlexLoRA-style dynamic rank allocation based on local data complexity |
| Vision encoder fine-tuning instability with few-shot medical data | Freeze SigLIP encoder for first 50% of training, then unfreeze final 4 layers with 10× lower learning rate |
| Hallucinated diagnoses in thinking mode | Constrain output via Gemma 4's native JSON structured output — force the model to select from ICD-11 code vocabulary; add a calibration head trained with temperature scaling on a held-out validation set |
| Communication overhead in federated rounds | LoRA adapters are ~6 MB vs. 4.7 GB full model (726× savings); use Flower's gRPC compression |
| Differential privacy for regulatory compliance | Apply Opacus per-sample gradient clipping (C=1.0, ε=8) during local training; privacy budget tracked per client |

### Key references

- Groh et al., "Evaluating Deep Neural Networks Trained on Clinical Images in Dermatology with the Fitzpatrick 17k Dataset" (CVPR 2021)
- Bai et al., "FlexLoRA: When Federated Parameter-Efficient Fine-Tuning Meets Heterogeneous Low-Rank Adaptation" (NeurIPS 2024)
- Daneshjou et al., "Disparities in Dermatology AI: Assessments Using Diverse Clinical Images" (Science Advances, 2022)
- MLCommons AILuminate v1.0 safety benchmark (December 2024) — for evaluating model safety in medical contexts
- VLBiasBench (2024) — for systematic VLM bias evaluation

---

## 2. CrisisLens — offline multimodal disaster triage from aerial imagery and field reports

**Track:** Global Resilience | **ML Areas:** CV + NLP + Multimodal + Edge

### Core research innovation

Current disaster AI systems treat building damage assessment (from satellite images) and situational awareness (from text reports) as separate pipelines. CrisisLens introduces a **joint multimodal triage formulation**: given an aerial/satellite image patch and a free-text field report (potentially in any of 20+ languages), produce a unified **triage priority score** (1–5) that fuses structural damage severity with humanitarian urgency signals (trapped persons, medical needs, infrastructure criticality). The novel architecture is a **cross-modal attention gating mechanism** where the vision encoder's damage features modulate the text decoder's attention weights, allowing the LLM to reason differently about text when severe structural damage is visible versus minor damage — effectively learning that "people inside" means something categorically different when the building is collapsed versus intact. The evaluation introduces a **triage-weighted F1** metric that penalizes misclassification of critical cases 4× more than non-critical cases, reflecting real disaster response resource allocation costs.

### How Gemma 4 is specifically leveraged

Use **Gemma 4 E4B** for field deployment (runs on a Jetson Orin Nano or ruggedized tablet). The SigLIP encoder processes aerial images at **280 tokens** (medium resolution, balancing detail and speed — sufficient for building-level damage classification at 0.5m resolution). The **audio encoder** (300M params, unique to E2B/E4B) processes voice field reports from first responders, eliminating the need for typed input in chaotic disaster environments. Gemma 4's **native function calling** triggers structured JSON output: `{building_id, damage_level, urgency_score, recommended_action, resource_type_needed}`. The **thinking mode** generates an auditable reasoning chain for each triage decision, critical for accountability in disaster operations.

### Datasets

- **xBD (xView2)** — 850,736 building annotations across 19 disaster events, pre/post satellite imagery with Joint Damage Scale labels (primary CV training)
- **CrisisMMD** — 16,058 tweets + 18,082 images from 7 major 2017 disasters, annotated for informativeness and humanitarian categories (multimodal fusion training)
- **SpaceNet 8** — flood-disaster dataset, 32K buildings, 1,300 km roads (supplementary flood scenarios)
- **MEDIC** — 71,198 social media disaster images for multi-task classification
- **CrisisNLP** — multilingual crisis tweets with humanitarian category labels (NLP component)

### Demo interaction

A tablet-style interface simulating an emergency operations center. The user drops a satellite image tile onto the map (pre-loaded from xBD), then speaks or types a field report in any of several languages ("Hay personas atrapadas en el segundo piso, el techo se derrumbó"). CrisisLens fuses both inputs and overlays a color-coded triage heatmap on the satellite image, with each building annotated by priority level. Tapping a building reveals the full reasoning chain. A sidebar shows real-time resource allocation recommendations. The entire system runs **fully offline** on a simulated edge device (demonstrated via a Docker container with memory/compute limits matching a Jetson Orin Nano).

### Why it would win

Disaster response is a headline-grabbing application with immediate life-or-death stakes. The **offline-first** architecture directly addresses that disaster zones lose connectivity. The **audio input** via Gemma 4 E4B's native audio encoder is a differentiator no other open model offers at this size. The cross-modal attention gating is a genuine architectural contribution. Past Google Solution Challenge winners (Alpha-Eye, Saheli) won precisely by demonstrating working prototypes for high-stakes scenarios.

### Key ML challenges and technical solutions

| Challenge | Solution |
|-----------|----------|
| Domain gap between satellite imagery (xBD) and drone/phone imagery (field conditions) | Two-stage fine-tuning: first on xBD satellite data, then on LADI v2 aerial drone images with augmentation (rotation, blur, contrast shifts simulating poor capture conditions) |
| Multilingual field reports with code-switching and informal language | Leverage Gemma 4's 140+ language training; add CrisisNLP multilingual crisis vocabulary via continued pretraining on 5K crisis-specific text samples |
| Latency requirement (<5 seconds per triage on edge hardware) | INT4 quantization of E4B via llama.cpp GGUF; vision token budget set to 280 (not 1120); batch inference of text+image in single forward pass |
| Calibrating triage scores to match expert disaster responder judgments | Collect 500 expert triage annotations on held-out xBD+CrisisMMD pairs; train a lightweight calibration layer; evaluate with Expected Calibration Error (ECE) |
| Audio encoder handling noisy field conditions (sirens, wind, crosstalk) | Data augmentation with SpecAugment + additive noise from AudioSet environmental sounds during fine-tuning |

### Key references

- Gupta et al., "xBD: A Dataset for Assessing Building Damage from Satellite Imagery" (CVPRW 2019)
- Alam et al., "CrisisMMD: Multimodal Twitter Datasets from Natural Disasters" (ICWSM 2018)
- CLIP-BCA-Gated (2025) — 91.77% accuracy on CrisisMMD with real-time processing (0.083s/instance)
- Nava et al., "AI Landslide Detection" (NHESS 2025) — 7,000 landslides detected in 3 hours post-earthquake
- NASA/IBM Prithvi geospatial foundation model — for comparison benchmarking

---

## 3. TruthLens — multimodal misinformation detection with chain-of-verification reasoning

**Track:** Safety & Trust | **ML Areas:** NLP + CV + Multimodal

### Core research innovation

Existing misinformation detectors output binary verdicts (real/fake) without auditable reasoning, limiting trust and adoption. TruthLens formulates misinformation detection as a **multi-step chain-of-verification (CoV) task**: (1) extract visual claims from the image (objects, text, scene context), (2) extract textual claims from the caption/article, (3) check **intra-modal consistency** (does the image metadata match the visual content?), (4) check **cross-modal consistency** (does the text accurately describe the image?), (5) generate a structured verdict with per-claim evidence scores. The novel contribution is a **consistency graph** — a lightweight GNN layer over the claim-level embeddings that explicitly models claim-to-claim dependencies — showing that cross-modal inconsistencies propagate predictably through the graph (e.g., a mismatched location claim makes temporal claims suspicious too). Evaluation combines standard accuracy/F1 with a new **Explanation Faithfulness Score** measuring whether the generated reasoning chain actually corresponds to the features the model attends to (via gradient-weighted attention analysis).

### How Gemma 4 is specifically leveraged

Use **Gemma 4 26B MoE** (3.8B active parameters — inference speed of a 4B model with quality approaching 31B) for the core reasoning pipeline. The SigLIP encoder processes news images at **1120 tokens** (maximum resolution — OCR and fine-grained detail matter for detecting manipulated text in images). The **thinking mode** naturally produces the multi-step CoV reasoning chain. Gemma 4's **MoE architecture** is particularly suited here because different experts can specialize in different verification subtasks (visual forensics, textual fact-checking, cross-modal alignment) — the 128-expert pool with 8 active per token provides natural task decomposition. Native **function calling** enables the model to invoke external tools: reverse image search API, EXIF metadata extraction, and a knowledge graph lookup, making this an **agentic verification system**.

### Datasets

- **NewsCLIPpings** (1.1M pairs) — out-of-context image-text pairs from 4 news agencies (primary training)
- **Fakeddit** (>1M samples) — Reddit multimodal misinformation with fine-grained labels (6-way classification)
- **MMFakeBench** (11K+ pairs) — mixed-source benchmark covering textual, visual, and cross-modal distortions including AI-generated content (evaluation)
- **COSMOS** (200K samples) — contextual inconsistency with bounding box annotations (cross-modal training)
- **OmniFake** — unified benchmark for human-crafted + AI-generated misinformation (generalization test)

### Demo interaction

A browser-based fact-checking workbench. Users paste a social media post (image + text) or upload a screenshot. TruthLens streams its thinking-mode reasoning in real time: "Step 1: Visual Analysis — I see a flooded street with buildings, watermark suggests Reuters... Step 2: Text Analysis — Caption claims this is Miami, October 2025... Step 3: Cross-Modal Check — Building signage in image is in Portuguese, inconsistent with Miami claim... Step 4: Metadata — EXIF data shows camera location in Porto Alegre, Brazil..." A visual "consistency graph" renders alongside, with green/red nodes showing which claims check out and which conflict. The final verdict panel shows a confidence-calibrated score with per-claim breakdown.

### Why it would win

Misinformation is a top-3 global risk per the World Economic Forum. The **explainable reasoning chain** differentiates this from black-box detectors. The agentic tool-use (reverse image search, EXIF extraction) via Gemma 4's native function calling demonstrates a sophisticated multi-step workflow that judges value highly (40% weight on Technical Execution). SNIFFER (CVPR 2024) achieved 88.4% on NewsCLIPpings with a similar philosophy but used proprietary models; TruthLens replicates this approach with fully open Gemma 4.

### Key ML challenges and technical solutions

| Challenge | Solution |
|-----------|----------|
| MoE fine-tuning instability (router weight collapse) | Follow Unsloth guidance: use 16-bit LoRA (not QLoRA) for the MoE variant; freeze router weights and only fine-tune expert MLPs + attention projections |
| AI-generated images evade traditional forensic signals | Train a lightweight binary classifier head on DALL-E/SD/MidJourney outputs from MMFakeBench; fuse its signal as an additional node in the consistency graph |
| Explanation faithfulness (model might generate plausible but unfaithful explanations) | Compute gradient-weighted class activation maps on the vision encoder; measure correlation between attention regions cited in text reasoning and actual high-gradient regions; add a faithfulness regularization term during training |
| Cross-dataset generalization (models overfit to dataset-specific artifacts) | Train on NewsCLIPpings + Fakeddit jointly; evaluate zero-shot on MMFakeBench and OmniFake; use domain-adversarial training to reduce dataset signature |
| Latency for interactive demo | 26B MoE runs at ~4B-parameter speed (3.8B active); serve via vLLM with tensor parallelism on 2× RTX 4090; target <8 seconds for full CoV chain |

### Key references

- Qi et al., "SNIFFER: Multimodal Large Language Model for Explainable Out-of-Context Misinformation Detection" (CVPR 2024)
- Liu et al., "MMFakeBench: A Mixed-Source Multimodal Misinformation Detection Benchmark" (ICLR 2025)
- Tahmasebi et al., "Multimodal Misinformation Detection using Large Vision-Language Models" (CIKM 2024)
- UMFDet + OmniFake (2025) — unified detection with Category-aware MoE Adapter
- FND-LLM (2024) — LLM-Enhanced multimodal fake news detection with reasoning branch

---

## 4. MathMentor — adaptive multilingual math tutoring with visual problem understanding

**Track:** Future of Education + Digital Equity | **ML Areas:** Multimodal + NLP + Edge

### Core research innovation

Current AI tutors either understand text-based math or process images, but rarely do both while maintaining a **Socratic pedagogical model** — most just produce answers. MathMentor introduces a **visual Socratic dialogue framework**: given a photograph of a handwritten math problem or textbook diagram, the model (1) parses the visual content into a structured mathematical representation, (2) identifies the student's current knowledge state via a lightweight **Bayesian knowledge tracing** module, (3) generates a Socratic hint sequence that guides the student toward the solution without revealing it, adapting difficulty based on the knowledge state. The novel formulation is **hint-level reinforcement learning**: instead of optimizing for answer correctness, the reward signal is the student's subsequent problem-solving success rate — the model learns that the best hint is the one that maximizes the student's independent performance on the *next* problem. Evaluation uses a new **Pedagogical Effectiveness Score** combining hint quality (rated by teachers), student learning gain (pre/post accuracy delta), and engagement retention.

### How Gemma 4 is specifically leveraged

Deploy **Gemma 4 E4B** for on-device tutoring (runs on student tablets/phones, critical for schools with limited or no internet). The SigLIP encoder's **variable resolution** is used adaptively: **1120 tokens** for handwritten equations (OCR-intensive) and **280 tokens** for geometric diagrams (spatial relationships matter more than pixel detail). The **128K context window** maintains full dialogue history across a tutoring session (typically 20–40 exchanges). Gemma 4's **thinking mode** is repurposed as the model's internal pedagogical reasoning: "The student got the quadratic formula wrong because they forgot to negate b... I should ask them to re-examine the sign of the first term." This thinking trace is hidden from the student but visible to the teacher in a dashboard view. The **multilingual 262K tokenizer** enables the same model to tutor in English, Hindi, Swahili, Spanish, and Arabic without language-specific fine-tuning.

### Datasets

- **MathVista** (6,141 examples, 28 datasets, ICLR 2024) — multi-task math+visual benchmark for training and evaluation
- **MATH-Vision** (3,040 competition problems, 16 disciplines, NeurIPS 2024) — harder problems for advanced students
- **GSM8K** (8.5K grade-school math problems) — foundational arithmetic/algebra training
- **CVQA** (NeurIPS 2024) — culturally diverse multilingual VQA for non-English evaluation
- **Khan Academy exercise logs** (publicly available subset via KDD Cup) — for knowledge tracing model training

### Demo interaction

A phone-optimized web app (PWA for offline use). The student points their camera at a math problem — handwritten on paper or in a textbook. MathMentor visually parses it (displaying the recognized equation overlaid on the image for confirmation), then begins a dialogue: "I can see you're working on solving 2x² - 5x + 3 = 0. What method would you like to try?" As the student responds, the model adapts: if they say "factoring," it guides them through factor identification; if they're stuck, it offers progressively more specific hints. A teacher dashboard view shows the class-wide knowledge map (which concepts are mastered/struggling), the hidden thinking traces, and per-student learning curves. The entire system runs offline after initial model download (**~1.5 GB** for INT4 E4B).

### Why it would win

Education is a perennial hackathon-winning theme. The **Socratic approach** (hints, not answers) aligns with UNESCO's AI in Education framework emphasizing learner agency. **Offline operation** on commodity phones addresses the stat that only 40% of primary schools globally have internet. The Gemini API Competition's CogniPath winner succeeded with educational AI for children; MathMentor takes this further with genuine pedagogical innovation (RL-optimized hint generation). The **visual input** from camera photos makes the demo immediately compelling and differentiated from text-only chatbot tutors.

### Key ML challenges and technical solutions

| Challenge | Solution |
|-----------|----------|
| Handwritten math OCR accuracy (diverse handwriting styles) | Fine-tune SigLIP encoder at 1120-token resolution on the CROHME handwriting dataset + synthetic handwritten math generated via HWT-style handwriting synthesis; evaluate with Character Error Rate |
| Hint quality without ground-truth hint sequences | Use GRPO (Group Relative Policy Optimization, supported natively by Unsloth/TRL for Gemma 4): generate K candidate hints per state, score them with a teacher-quality reward model trained on 2K expert-annotated hint examples |
| Knowledge tracing with sparse student data | Implement a Deep Knowledge Tracing (DKT) module as a separate lightweight LSTM (not part of Gemma); feed its knowledge state vector as a soft prompt prefix to Gemma 4 at each turn |
| Preventing the model from giving away answers | Add a "no-answer" constraint via constrained decoding: blacklist numeric answer tokens when in Socratic mode; validate with a separate classifier that flags direct-answer responses |
| Multilingual math notation variations | Leverage Gemma 4's 140+ language training; add 1K multilingual math problem-solution pairs per target language during fine-tuning (synthetically generated via Gemma 4 31B) |

### Key references

- Lu et al., "MathVista: Evaluating Mathematical Reasoning in Visual Contexts" (ICLR 2024)
- Wang et al., "MATH-Vision: Competition-Level Math Problems" (NeurIPS 2024)
- Physics-STAR framework (2024) — structured thinking, analysis, and reasoning for physics education
- LLM Agents for Education (ACL 2025) — mapping educational tasks to LLM agent capabilities
- Küchemann et al. (2025) — personalized learning tool creation with foundation models

---

## 5. LinguaBridge — federated low-resource language model with community-driven data collection

**Track:** Digital Equity & Inclusivity + Future of Education | **ML Areas:** Federated + NLP + Multimodal + Edge

### Core research innovation

Low-resource languages (covering billions of speakers across Africa, South Asia, Southeast Asia) remain poorly served by LLMs because training data is centralized and scarce. LinguaBridge flips the paradigm: it deploys Gemma 4 E2B on community members' phones as a **federated data collection and model improvement loop**. Users interact with the model in their language (via text or voice through the audio encoder); when the model fails — producing an incorrect translation, an inappropriate response, or gibberish — the user provides a correction. These corrections become local fine-tuning signal via **on-device LoRA updates**, which are federated back to a central server without transmitting any user data. The novel contribution is a **linguistically-informed federated aggregation** strategy: adapter updates from dialectally similar clients (measured via tokenizer perplexity correlation) are clustered and aggregated separately before global merging, preventing dialectal interference (e.g., ensuring that Wolof corrections don't degrade Bambara performance despite both being Mande languages). Evaluation uses a **community-validated BLEU** — standard BLEU scored against translations validated by native-speaker community members rather than professional translators, capturing the living, spoken form of the language.

### How Gemma 4 is specifically leveraged

**Gemma 4 E2B** is the deployment target — at **2.3B effective parameters**, it fits on phones with INT4 quantization in under 1.5 GB. The **audio encoder** (300M conformer, exclusive to E2B/E4B) enables voice input, critical for communities with low literacy rates and oral-tradition languages. The **262K SentencePiece vocabulary** provides meaningful byte-level fallback encoding for scripts not well-represented in training (Ge'ez, N'Ko, Thaana), while dedicated tokens exist for Arabic, Devanagari, and Latin-script African languages. The **Per-Layer Embeddings (PLE)** architecture is leveraged for efficient fine-tuning: rather than full LoRA on all layers, PLE residuals for the target language are adjusted, providing language-specific specialization at minimal parameter cost (~0.5% of total model). Gemma 4's **native system instructions** allow embedding cultural and linguistic guidelines that persist across the entire conversation.

### Datasets

- **AfriSenti** (110K+ tweets, 14 African languages) — sentiment analysis baseline and evaluation
- **InkubaLM datasets** — Inkuba-Mono (1.9B tokens) and Inkuba-Instruct for Swahili, Yoruba, IsiXhosa, Hausa, IsiZulu
- **FLORES-200** (Meta) — parallel sentences in 200 languages for translation quality evaluation
- **African Next Voices** (9K+ hours speech, 18 African languages) — ASR and audio processing
- **Belebele** (reading comprehension in 122 languages) — multilingual understanding evaluation
- **AGE Dataset** — Amharic-Ge'ez-English parallel corpus for under-resourced script evaluation

### Demo interaction

A WhatsApp-style messaging interface (reflecting how Darli AI successfully reached 110K+ farmers in Ghana). Users send text or voice messages in their language. LinguaBridge responds in the same language — translating content, answering questions, or assisting with tasks (reading a medicine label, understanding a government form by photographing it with the camera). When the response is wrong, the user taps a "correct this" button and provides the right answer by voice or text. A community dashboard shows: (1) language coverage map with per-language quality scores, (2) federated training progress (rounds completed, active devices), (3) a leaderboard of most-improved languages, and (4) sample corrections flowing in anonymously. The demo simulates 50 federated clients across 5 languages using Flower's simulation engine.

### Why it would win

Digital equity is an underserved hackathon category with enormous impact potential. The **community-in-the-loop** design — where users simultaneously benefit from and improve the model — creates a compelling narrative and flywheel effect. WhatsApp delivery meets users where they are (2B+ global users). Voice input via Gemma 4's native audio encoder removes literacy barriers. Federated training preserves privacy of potentially sensitive community data. The Darli AI precedent (named "best invention of 2024" by TIME) validates this approach. No other open model at **1.5 GB** offers text+image+audio multimodality — this is Gemma 4 E2B's unique selling point.

### Key ML challenges and technical solutions

| Challenge | Solution |
|-----------|----------|
| Extremely limited labeled data for many target languages (<1K parallel sentences) | Bootstrap via cross-lingual transfer from Gemma 4's 140+ language pretraining; use back-translation with the E2B model itself to synthetically generate training pairs; validate with native speakers |
| User corrections may be noisy or adversarial | Implement a confidence-weighted correction filter: only apply corrections where 3+ independent users provide similar feedback for similar inputs (inspired by crowd-sourcing quality control from Amazon Mechanical Turk research) |
| Dialectal interference during federated aggregation | Cluster clients by tokenizer perplexity on a shared reference set (100 sentences in each language); aggregate within-cluster first (FedAvg), then merge clusters with weighted averaging proportional to cluster size |
| Audio encoder struggles with tonal languages (Yoruba, Mandarin, Bambara) | Fine-tune the conformer audio encoder layers alongside LoRA on text decoder using ANV Bambara corpus (612 hours) and African Next Voices data; evaluate with Word Error Rate per language |
| On-device training memory constraints (phones with 3–4 GB RAM) | Use Gemma 4's PLE-only fine-tuning (adjust only Per-Layer Embedding residuals, ~12M parameters) instead of full LoRA; quantize activations to INT8 during local training |

### Key references

- Oladipo et al., "AfriSenti: A Twitter Sentiment Analysis Benchmark for African Languages" (EMNLP 2023)
- Tonja et al., "InkubaLM: A Small Language Model for Low-Resource African Languages" (2024)
- FlexLoRA (NeurIPS 2024) — heterogeneous federated fine-tuning with dynamic rank
- FedPSF-LLM (2025) — 52% variance reduction across heterogeneous NLP clients
- Belebele Reading Comprehension Benchmark (Meta, 122 languages)

---

## How to choose: a decision matrix

| Project | Technical Novelty | Demo Impact | Feasibility (6 weeks) | Track Alignment | Edge/Offline | Recommended If... |
|---------|:-:|:-:|:-:|:-:|:-:|---------|
| **FedDermScreen** | ★★★★★ | ★★★★☆ | ★★★★☆ | Health + Equity | ★★★★★ | Your team is strong in federated learning and fairness |
| **CrisisLens** | ★★★★☆ | ★★★★★ | ★★★☆☆ | Resilience | ★★★★★ | You want maximum visual demo impact |
| **TruthLens** | ★★★★★ | ★★★★☆ | ★★★★☆ | Safety & Trust | ★★★☆☆ | Your team excels at agentic systems and reasoning |
| **MathMentor** | ★★★★☆ | ★★★★★ | ★★★★★ | Education + Equity | ★★★★☆ | You want the safest path to a polished demo |
| **LinguaBridge** | ★★★★☆ | ★★★★☆ | ★★★☆☆ | Equity + Education | ★★★★★ | Your team has access to native speakers for evaluation |

**The highest expected-value choice is FedDermScreen or MathMentor.** FedDermScreen combines the most ML subfields (federated + CV + multimodal + edge), targets the Health track which historically attracts the most attention, and directly addresses a documented fairness gap — giving judges a clear "this is novel AND impactful" signal. MathMentor has the highest demo polish potential and broadest user base, making it the safest bet for a compelling 3-minute video.

For maximum ambition, **combine elements**: a federated medical-education hybrid — say, a system that trains community health workers to screen skin lesions using an AI tutor (MathMentor's pedagogical framework) that improves its diagnostic model via federated learning from the workers' field data (FedDermScreen's backend). This crosses three tracks simultaneously and would be genuinely unprecedented.
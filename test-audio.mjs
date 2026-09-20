/**
 * Starter-deck audio generator for OpenRouter text-to-speech.
 *
 * Run it with `make test-audio` (or `yarn test-audio`). It synthesizes every
 * phrase in TEXT_LIST and writes `audio-<sanitized>.mp3` into
 * `supabase/assets/start_audios/`. Files that already exist are skipped, so a
 * run interrupted by the OpenRouter rate limit (free-models-per-min) resumes
 * at the first missing phrase instead of re-requesting everything.
 *
 * Upload the folder to Storage with `make audio.upload` (audios/default).
 *
 * Requires OPENROUTER_API_KEY, set in .env or exported in the shell.
 */
import { existsSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { OpenRouter } from "@openrouter/sdk";
// ('How have you been?', 'Como você tem passado?', '/haʊ hæv juː biːn/', 'Hey, long time no see! How have you been?', array['greetings']),
//   ('How''s it going? / What''s up?', 'E aí, tudo bem? / E aí?', 'háuz it góu-ing / uóts âp', 'Hey man, what''s up?', array['greetings', 'slang']),
//   ('Where are you from?', 'De onde você é?', 'uêr ár iú fróm', 'Nice to meet you! Where are you from?', array['introductions']),
//   ('How long have you been here?', 'Há quanto tempo você está aqui?', 'háu lóng hév iú bín híer', 'How long have you been here in Canada?', array['introductions']),

//   -- reactions / everyday -----------------------------------------------------
//   ('I got it', 'Entendi / Peguei / Deixa comigo', 'ai gót it', 'Don''t worry, I got it.', array['idioms', 'daily']),
//   ('I got this', 'Eu dou conta / Deixa comigo', 'ai gót đis', 'Leave the report to me, I got this.', array['idioms', 'encouragement']),
//   ('You got this!', 'Você consegue! / Tô torcendo por você', 'iú gót đis', 'You have an interview? You got this!', array['encouragement']),
//   ('I gotta go / eat / study', 'Tenho que ir / comer / estudar', 'ai góra góu / ít / stâdi', 'I gotta go, see you later!', array['daily', 'slang']),
//   ('That''s amazing!', 'Que incrível!', 'đéts ê-méi-zing', 'You won the prize? That''s amazing!', array['reactions']),
//   ('That''s funny!', 'Que engraçado!', 'đéts fâ-ni', 'Hahaha, that''s funny!', array['reactions']),
//   ('Check this out', 'Olha isso aqui / Dá uma olhada', 'tchéc đis áut', 'Check this out! Look at this picture.', array['daily', 'phrasal-verbs']),
//   ('Gotcha!', 'Saquei! / Entendi!', 'gó-tcha', 'Oh, gotcha! Now I understand.', array['slang', 'reactions']),
//   ('No worries', 'Tranquilo / Sem problemas', 'nóu uâ-ris', 'Thanks for waiting! — No worries!', array['politeness', 'daily']),
//   ('Sorry about that / My bad', 'Desculpa por isso / Foi mal', 'só-ri ê-baut đét / mái béd', 'I dropped the pen, my bad!', array['politeness', 'daily']),
//   ('Excuse me', 'Com licença / Com permissão', 'ic-sciúz mí', 'Excuse me, where is the bathroom?', array['politeness']),

//   -- agreement / opinions -----------------------------------------------------
//   ('I agree with that', 'Concordo com isso', 'ai ê-grí uíđ đét', 'That''s a good point, I agree with that.', array['opinions']),
//   ('I''m not sure', 'Não tenho certeza', 'aim nót shúr', 'I''m not sure what time the meeting starts.', array['opinions']),
//   ('I don''t think so', 'Acho que não', 'ai dóunt fink sóu', 'Will it rain today? I don''t think so.', array['opinions']),
//   ('I mean it', 'Estou falando sério', 'ai mín it', 'I''m going to quit, and I mean it!', array['opinions']),
//   ('I think you''re overreacting', 'Acho que você está exagerando', 'ai fink iúr óver-ri-éc-ting', 'Calm down, I think you''re overreacting.', array['opinions']),
//   ('Don''t get me wrong', 'Não me entenda mal', 'dóunt guét mí rông', 'Don''t get me wrong, I love your project.', array['idioms', 'opinions']),
//   ('That works for me', 'Por mim tudo bem / Funciona pra mim', 'đét uêrcs fór mí', 'Is 3 PM good for you? — Yes, that works for me.', array['agreement', 'work']),
//   ('I''m down', 'Tô dentro! / Eu topo!', 'aim dáun', 'Do you want to grab pizza? — I''m down!', array['slang', 'daily']),
//   ('I''m good', 'Tô de boa / Não precisa (recusa cortês)', 'aim gúd', 'More coffee? — No, thanks, I''m good.', array['daily', 'politeness']),

//   -- requests / politeness ----------------------------------------------------
//   ('Could you help me?', 'Você poderia me ajudar?', 'cúd iú hélp mí', 'Could you help me carry this box?', array['requests', 'politeness']),
//   ('Can I get a coffee, please?', 'Me vê um café, por favor?', 'cên ai guét ê có-fi plíz', 'Hi! Can I get a coffee, please?', array['requests', 'politeness']),
//   ('I''d like this, please.', 'Eu queria este, por favor.', 'aid láic đis plíz', 'I''d like this coffee, please.', array['shopping', 'politeness']),
//   ('I appreciate your time', 'Agradeço pelo seu tempo', 'ai ê-prí-shi-eit iór táim', 'Thank you for meeting me, I appreciate your time.', array['politeness', 'work']),
//   ('Give me a second / Hold on a sec', 'Me dá um segundo / Espera um pouco', 'guív mí ê sé-cond / hóuld ón ê séc', 'Hold on a sec, I need to take this call.', array['requests', 'daily']),
//   ('Let me check', 'Deixa eu ver / checar', 'lét mí tchéc', 'Let me check my schedule first.', array['requests']),
//   ('Bear with me', 'Tenha um pouco de paciência comigo', 'bêr uíđ mí', 'Bear with me while I load the presentation.', array['politeness', 'requests']),
//   ('I beg your pardon?', 'Como? / Pode repetir?', 'ai bégu iór pár-don', 'I beg your pardon? Could you say that again?', array['politeness', 'requests']),
//   ('Could you speak up, please?', 'Você poderia falar mais alto, por favor?', '/kʊd juː spiːk ʌp pliːz/', 'The line is bad, could you speak up, please?', array['requests']),
//   ('I could use a hand.', 'Eu poderia usar uma ajuda.', '/aɪ kʊd juːz ə hænd/', 'This box is heavy, I could use a hand.', array['requests', 'idioms']),

//   -- work / communication -----------------------------------------------------
//   ('Can we schedule a meeting?', 'Podemos agendar uma reunião?', 'cên uí scué-djul ê mí-ting', 'Can we schedule a meeting for tomorrow?', array['work', 'requests']),
//   ('I''ll let you know', 'Eu te aviso / Te mantenho informado', 'áil lét iú nóu', 'Once I get the answer, I''ll let you know.', array['work', 'daily']),
//   ('I''ll send it to you', 'Eu envio para você', 'áil sénd it tú iú', 'Don''t worry, I''ll send it to you by email.', array['work']),
//   ('Does that make sense?', 'Isso faz sentido?', 'dâz đét méic sens', 'I explained the plan, does that make sense?', array['work', 'communication']),
//   ('I''m on it', 'Vou cuidar disso já', 'aim ón it', 'Can you send that file? — I''m on it!', array['work', 'daily']),
//   ('Let''s get started', 'Vamos começar', 'léts guét stár-ted', 'Everyone is here, so let''s get started.', array['work', 'daily']),
//   ('It''s been a while since I worked with...', 'Faz tempo que não trabalho com...', 'its bín ê uái-ol sins ai uêrct uíđ', 'It''s been a while since I worked with Node.js.', array['work', 'grammar-structures']),
//   ('I was supposed to...', 'Era para eu...', 'ai uóz sê-póust tú', 'I was supposed to send that email yesterday.', array['grammar-structures', 'work']),
//   ('Let me get back to you.', 'Deixa eu te retornar (depois).', '/lɛt miː ɡɛt bæk tuː juː/', 'I need to check the numbers, let me get back to you.', array['work']),
//   ('Run it by (someone)', 'Checar / Pedir aprovação de alguém', 'rân it bái', 'Let me run this idea by my boss first.', array['phrasal-verbs', 'work']),
//   ('Go over', 'Revisar / Analisar', 'góu óver', 'Let''s go over the plan one more time.', array['phrasal-verbs', 'work']),

//   -- plans / time -------------------------------------------------------------
//   ('I''m on my way', 'Estou a caminho', 'aim ón mái uêi', 'Don''t worry, I''m on my way!', array['daily', 'time']),
//   ('I''m running late', 'Estou atrasado(a)', 'aim râ-ning léit', 'Sorry, I''m running late due to traffic.', array['daily', 'time']),
//   ('Let''s go', 'Vamos', 'léts góu', 'The taxi is here, let''s go!', array['daily']),
//   ('So far', 'Até agora', 'sóu fár', 'So far, everything is going well.', array['time', 'connectors']),
//   ('In the meantime', 'Enquanto isso', 'in đê mín-táim', 'The food is cooking; in the meantime, let''s chat.', array['connectors', 'time']),
//   ('I''ll figure it out', 'Vou dar um jeito / Descobrir', 'áil fíg-iuer it áut', 'I don''t know this app, but I''ll figure it out.', array['daily', 'problem-solving']),
//   ('I can''t wait', 'Não vejo a hora', 'ai cênt uêit', 'I can''t wait for the weekend!', array['feelings']),
//   ('I am looking forward to it.', 'Estou ansioso por isso.', '/aɪ æm ˈlʊkɪŋ ˈfɔːrwərd tuː ɪt/', 'The trip is next month, I am looking forward to it.', array['feelings']),
//   ('Another day, another dollar', 'Mais um dia normal de trabalho', 'ê-nâ-đer déi ê-nâ-đer dó-lar', 'How''s work? — Ah, another day, another dollar.', array['idioms', 'work']),

//   -- about / suggestions ------------------------------------------------------
//   ('I''m about to leave', 'Estou prestes a sair', 'aim ê-baut tú lív', 'Hurry up, I''m about to leave.', array['grammar-structures', 'daily']),
//   ('She was about to cry', 'Ela estava prestes a chorar', 'shí uóz ê-baut tú crái', 'She was about to cry after the news.', array['grammar-structures']),
//   ('She is about my age', 'Ela tem aproximadamente a minha idade', 'shí iz ê-baut mái éidj', 'I don''t know her exact age, but she is about my age.', array['about']),
//   ('Her house is about 10 minutes away', 'A casa dela fica a cerca de 10 min daqui', 'rêr háus iz ê-baut ten mínits ê-uêi', 'We will arrive soon, her house is about 10 minutes away.', array['about']),
//   ('What about / How about...?', 'Que tal...? / E se...?', 'uót ê-baut / háu ê-baut', 'How about we go out tonight?', array['about', 'suggestions']),

//   -- shopping / money ---------------------------------------------------------
//   ('How much is this?', 'Quanto custa isto?', 'háu mâtch iz đis', 'Excuse me, how much is this shirt?', array['shopping']),
//   ('A rip-off', 'Um roubo (algo muito caro)', 'ê ríp-óf', '10 dollars for a water? What a rip-off!', array['idioms', 'shopping']),

//   -- phrasal verbs ------------------------------------------------------------
//   ('Get by', 'Se virar / Dar meus pulos', 'guét bái', 'My English is not perfect, but I can get by.', array['phrasal-verbs']),
//   ('Come across', 'Encontrar algo por acaso', 'câm ê-crós', 'I came across an old photo yesterday.', array['phrasal-verbs']),
//   ('Come across as', 'Parecer / Dar a entender que é', 'câm ê-crós éz', 'He can come across as rude sometimes.', array['phrasal-verbs']),
//   ('Pull off', 'Conseguir fazer algo difícil', 'púl óf', 'She pulled off a great event in two days.', array['phrasal-verbs']),
//   ('Bring up', 'Mencionar / Trazer um assunto', 'bring âp', 'Why did you bring up that topic?', array['phrasal-verbs']),
//   ('Check out', 'Examina / Dá uma olhada', 'tchéc áut', 'Check out this new website!', array['phrasal-verbs']),
//   ('Put up with', 'Tolerar / Aturar', 'pút âp uíđ', 'I can''t put up with this noise anymore.', array['phrasal-verbs']),
//   ('Put away', 'Guardar', 'pút ê-uêi', 'Please put away your toys.', array['phrasal-verbs']),
//   ('Put on', 'Vestir / Colocar (roupa, acessório)', 'pút ón', 'It''s cold, put on a jacket.', array['phrasal-verbs']),
//   ('Put off', 'Adiar', 'pút óf', 'Never put off until tomorrow what you can do today.', array['phrasal-verbs']),
//   ('Put out', 'Apagar (fogo, cigarro)', 'pút áut', 'The firefighters put out the fire.', array['phrasal-verbs']),
//   ('Put down', 'Colocar no chão/mesa; humilhar', 'pút dáun', 'Please put down the glass.', array['phrasal-verbs']),
//   ('Put aside', 'Separar / Reservar', 'pút ê-sáid', 'I put aside some money for my trip.', array['phrasal-verbs']),
//   ('Put together', 'Montar / Juntar peças', 'pút tú-gué-đer', 'It took two hours to put this table together.', array['phrasal-verbs']),
//   ('Blow up', 'Explodir; Perder a paciência', 'blóu âp', 'He blew up when he heard the news.', array['phrasal-verbs']),
//   ('Wipe out', 'Eliminar / Destruir', 'uáip áut', 'The storm wiped out the small village.', array['phrasal-verbs']),
//   ('Shout out', 'Mandar um abraço / Fazer uma menção', 'sháut áut', 'A quick shout out to my team for the hard work.', array['phrasal-verbs', 'slang']),
//   ('Bring back', 'Devolver / Trazer de volta', 'bring béc', 'Please bring back my book tomorrow.', array['phrasal-verbs']),

//   -- idioms / slang -----------------------------------------------------------
//   ('It''s worth a shot', 'Vale a pena tentar', 'its uêrf ê shót', 'The job is tough, but it''s worth a shot.', array['idioms']),
//   ('Easier said than done', 'Mais fácil falar do que fazer', 'ízi-er séd đên dân', 'Losing weight is easier said than done.', array['idioms']),
//   ('Don''t get your hopes up', 'Não crie muitas expectativas', 'dóunt guét iór hóups âp', 'We might get a bonus, but don''t get your hopes up.', array['idioms', 'advice']),
//   ('Like father, like daughter', 'Tal pai, tal filha', 'láic fá-đer láic dó-ter', 'She loves coffee just like him. Like father, like daughter.', array['idioms', 'family']),
//   ('Zip it!', 'Cala a boca! / Fica quieto', 'zíp it', 'Zip it! I''m trying to listen.', array['slang', 'imperatives']),
//   ('Rookie', 'Novato / Inexperiente', 'rú-ki', 'Don''t worry, he''s just a rookie.', array['slang', 'people']),
//   ('What''s your poison?', 'O que você vai beber?', 'uóts iór pói-zon', 'Welcome to the bar! What''s your poison?', array['idioms', 'slang']),
//   ('Reach for the stars', 'Mire alto / Tenha grandes metas', 'rítch fór đê stárs', 'Always reach for the stars in your career.', array['idioms', 'encouragement']),
//   ('Break a leg!', 'Boa sorte! (antes de uma apresentação)', '/breɪk ə lɛɡ/', 'You have a big presentation today, break a leg!', array['idioms']),
//   ('It slipped my mind.', 'Eu esqueci / me passou pela cabeça.', '/ɪt slɪpt maɪ maɪnd/', 'Sorry, the meeting totally slipped my mind.', array['idioms']),
//   ('I will take your word for it.', 'Vou acreditar no que você disse.', '/aɪ wɪl teɪk jɔːr wɜːrd fɔːr ɪt/', 'You are the expert here, I will take your word for it.', array['idioms']),
//   ('It is up to you.', 'Você que decide / depende de você.', '/ɪt ɪz ʌp tuː juː/', 'Pizza or sushi, it is up to you.', array['daily']),

//   -- connectors / discourse markers -------------------------------------------
//   ('To sum up', 'Para resumir', 'tú sâm âp', 'To sum up, we need to increase sales.', array['connectors']),
//   ('In general', 'Em geral / No geral', 'in djé-ne-ral', 'In general, I prefer working from home.', array['connectors']),
//   ('The point is...', 'O ponto é... / A questão é...', 'đê póint iz', 'The point is that we don''t have enough time.', array['connectors', 'opinions']),
//   ('What I mean is...', 'O que eu quero dizer é...', 'uót ai mín iz', 'What I mean is that we should try again.', array['connectors', 'opinions']),
//   ('As far as I know', 'Até onde eu sei', 'éz fár éz ai nóu', 'As far as I know, the event is still happening.', array['connectors', 'opinions']),
//   ('Moreover / In addition', 'Além disso / Adicionalmente', 'mór-óver / in ê-dí-shon', 'The house is beautiful. Moreover, it''s cheap.', array['connectors']),
//   ('However / Although', 'No entanto / Embora', 'hau-é-ver / ól-đóu', 'Although it was raining, we went for a walk.', array['connectors']),
//   ('On the other hand', 'Por outro lado', 'ón đê ó-đer hênd', 'It''s expensive; on the other hand, it''s high quality.', array['connectors']),
//   ('Therefore', 'Portanto', 'đêr-fór', 'I was tired; therefore, I went to sleep early.', array['connectors']),
//   ('So that', 'Para que / A fim de que', 'sóu đét', 'Save money so that you can travel.', array['connectors', 'grammar-structures']),

//   -- grammar structures -------------------------------------------------------
//   ('Do you ever...?', 'Você costuma...? / Você alguma vez...?', 'dú iú é-ver', 'Do you ever go to the gym on weekends?', array['grammar-structures', 'questions']),
//   ('Might''ve / Should''ve', 'Pode ter / Deveria ter', 'mái-tâv / shú-dâv', 'You should''ve called me earlier.', array['grammar-structures', 'contractions']),
//   ('Could''ve / Would''ve / Must''ve', 'Poderia / Teria / Deve ter', 'cú-dâv / uú-dâv / mâs-tâv', 'He must''ve forgotten his keys.', array['grammar-structures', 'contractions']),
//   ('Even if / Even though', 'Mesmo que / Embora', 'í-ven if / í-ven đóu', 'I will go even if it rains.', array['connectors', 'grammar-structures']),
//   ('Even so / Even now', 'Mesmo assim / Mesmo agora', 'í-ven sóu / í-ven náu', 'It was difficult, but even so, we made it.', array['connectors']),
//   ('Not even', 'Nem sequer / Nem mesmo', 'nót í-ven', 'He didn''t even say goodbye.', array['grammar-structures']),
//   ('Even better / Even worse', 'Melhor ainda / Pior ainda', 'í-ven bé-ter / í-ven uêrs', 'The second movie was even better!', array['comparisons']),

//   -- vocabulary ---------------------------------------------------------------
//   ('Current / Currently', 'Atual / Atualmente', 'câ-rent / câ-rent-li', 'My current job is remote. Currently, I live in Brazil.', array['vocabulary']),
//   ('Nowadays / At present', 'Hoje em dia / Atualmente', 'náu-ê-déiz / ét pré-zent', 'Nowadays, most people work online.', array['vocabulary', 'time'])
const TEXT_LIST = [
  "Hello! This is a text-to-speech test.",
  "How have you been?",
  "How's it going? / What's up?",
  "Where are you from?",
  "How long have you been here?",
  "I got it",
  "I got this",
  "You got this!",
  "I gotta go",
  "That's amazing!",
  "That's funny!",
  "Check this out",
  "Gotcha!",
  "No worries",
  "Sorry about that / My bad",
  "Excuse me",
  "I agree with that",
  "I'm not sure",
  "I don't think so",
  "I mean it",
  "I think you're overreacting",
  "Don't get me wrong",
  "That works for me",
  "I'm down",
  "I'm good",
  "Could you help me?",
  "Can I get a coffee, please?",
  "I'd like this, please.",
  "I appreciate your time",
  "Give me a second / Hold on a sec",
  "Let me check",
  "Bear with me",
  "I beg your pardon?",
  "Could you speak up, please?",
  "I could use a hand.",
  "Can we schedule a meeting?",
  "I'll let you know",
  "I'll send it to you",
  "Does that make sense?",
  "I'm on it",
  "Let's get started",
  "It's been a while since I worked with",
  "I was supposed to",
  "Let me get back to you.",
  "Run it by (someone)",
  "Go over",
  "I'm on my way",
  "I'm running late",
  "Let's go",
  "So far",
  "In the meantime",
  "I'll figure it out",
  "I can't wait",
  "I am looking forward to it.",
  "Another day, another dollar",
  "I'm about to leave",
  "She was about to cry",
  "She is about my age",
  "Her house is about 10 minutes away",
  "What about / How about...?",
  "How much is this?",
  "A rip-off",
  "Get by",
  "Come across",
  "Come across as",
  "Pull off",
  "Bring up",
  "Check out",
  "Put up with",
  "Put away",
  "Put on",
  "Put off",
  "Put out",
  "Put down",
  "Put aside",
  "Put together",
  "Blow up",
  "Wipe out",
  "Shout out",
  "Bring back",
  "It's worth a shot",
  "Easier said than done",
  "Don't get your hopes up",
  "Like father, like daughter",
  "Zip it!",
  "Rookie",
  "What's your poison?",
  "Reach for the stars",
  "Break a leg!",
  "It slipped my mind.",
  "I will take your word for it.",
  "It is up to you.",
  "To sum up",
  "In general",
  "The point is...",
  "What I mean is...",
  "As far as I know",
  "Moreover / In addition",
  "However / Although",
  "On the other hand",
  "Therefore",
  "So that",
  "Do you ever...?",
  "Might've / Should've",
  "Could've / Would've / Must've",
  "Even if / Even though",
  "Even so / Even now",
  "Not even",
  "Even better / Even worse",
  "Current / Currently",
  "Nowadays / At present"
];
const OUTPUT_DIR = join(
  dirname(fileURLToPath(import.meta.url)),
  "supabase/assets/start_audios",
);

// The seed's display text differs from the phrase we ask TTS to speak for a
// few cards. Keep the filename aligned with seed.sql by overriding the source
// string used to derive the file name (not the spoken text).
const FILENAME_OVERRIDES = {
  "I gotta go": "I gotta go / eat / study",
  "It's been a while since I worked with": "It's been a while since I worked with...",
  "I was supposed to": "I was supposed to...",
};

const audioOutputNameFromText = (text) => {
  const sanitizedText = text.replace(/[^a-zA-Z0-9]/g, "_");
  return `audio-${sanitizedText}.mp3`;
}
const audioFileName = (text) =>
  audioOutputNameFromText(FILENAME_OVERRIDES[text] ?? text);
const MODEL = process.env.TEST_AUDIO_MODEL ?? "deepgram/flux-tts:free";
const VOICE = process.env.TEST_AUDIO_VOICE ?? "flux-alexis-en";

const apiKey = process.env.OPENROUTER_API_KEY ?? "";
if (!apiKey) {
  console.error(
    "OPENROUTER_API_KEY is not set. Add it to .env or export it before running.",
  );
  process.exit(1);
}

try {
  await mkdir(OUTPUT_DIR, { recursive: true });

  for (const text of TEXT_LIST) {
    const outputName = audioFileName(text);
    const outputPath = join(OUTPUT_DIR, outputName);

    if (existsSync(outputPath)) {
      console.log(`Skipped "${text}" (${outputName} already exists).`);
      continue;
    }

    const openrouter = new OpenRouter({ apiKey });

    const stream = await openrouter.tts.createSpeech({
      speechRequest: {
        model: MODEL,
        input: text,
        voice: VOICE,
        responseFormat: "mp3",
      },
    });

    const reader = stream.getReader();
    const chunks = [];
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value) chunks.push(value);
    }

    const audio = Buffer.concat(chunks);
    await writeFile(outputPath, audio);

    console.log(`Synthesized "${text}" to ${outputName} using model ${MODEL} and voice ${VOICE}.`);
    console.log(`Saved ${audio.length} bytes to ${outputPath}`);
  }
} catch (cause) {
  console.error(
    "Text-to-speech failed:",
    cause instanceof Error ? cause.message : String(cause),
  );
  process.exit(1);
}


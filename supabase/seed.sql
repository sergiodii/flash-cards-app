-- =============================================================================
-- Seed data :: sample English cards
--
-- Idempotent: skips a card when the same English text already exists, so this
-- file is safe to run more than once (e.g. `make db.reset` and manual seeds).
-- =============================================================================

insert into public.flashcards (english, portuguese, phonetic, example, tags)
select
  v.english,
  v.portuguese,
  v.phonetic,
  v.example,
  v.tags
from (
  values
    (
      'How have you been?',
      'Como você tem passado?',
      '/haʊ hæv juː biːn/',
      'Hey, long time no see! How have you been?',
      array['greetings']
    ),
    (
      'I could use a hand.',
      'Eu poderia usar uma ajuda.',
      '/aɪ kʊd juːz ə hænd/',
      'This box is heavy, I could use a hand.',
      array['requests', 'idioms']
    ),
    (
      'It slipped my mind.',
      'Eu esqueci / me passou pela cabeça.',
      '/ɪt slɪpt maɪ maɪnd/',
      'Sorry, the meeting totally slipped my mind.',
      array['idioms']
    ),
    (
      'Let me get back to you.',
      'Deixa eu te retornar (depois).',
      '/lɛt miː ɡɛt bæk tuː juː/',
      'I need to check the numbers, let me get back to you.',
      array['work']
    ),
    (
      'That works for me.',
      'Isso funciona para mim.',
      '/ðæt wɜːrks fɔːr miː/',
      'Thursday at ten? That works for me.',
      array['agreement']
    ),
    (
      'I am running late.',
      'Estou atrasado.',
      '/aɪ æm ˈrʌnɪŋ leɪt/',
      'Sorry, I am running late, start without me.',
      array['daily']
    ),
    (
      'Could you speak up, please?',
      'Você poderia falar mais alto, por favor?',
      '/kʊd juː spiːk ʌp pliːz/',
      'The line is bad, could you speak up, please?',
      array['requests']
    ),
    (
      'It is worth a shot.',
      'Vale a tentativa.',
      '/ɪt ɪz wɜːrθ ə ʃɑːt/',
      'I do not know if it will work, but it is worth a shot.',
      array['idioms']
    ),
    (
      'I am looking forward to it.',
      'Estou ansioso por isso.',
      '/aɪ æm ˈlʊkɪŋ ˈfɔːrwərd tuː ɪt/',
      'The trip is next month, I am looking forward to it.',
      array['feelings']
    ),
    (
      'Break a leg!',
      'Boa sorte! (antes de uma apresentação)',
      '/breɪk ə lɛɡ/',
      'You have a big presentation today, break a leg!',
      array['idioms']
    ),
    (
      'It is up to you.',
      'Você que decide / depende de você.',
      '/ɪt ɪz ʌp tuː juː/',
      'Pizza or sushi, it is up to you.',
      array['daily']
    ),
    (
      'I will take your word for it.',
      'Vou acreditar no que você disse.',
      '/aɪ wɪl teɪk jɔːr wɜːrd fɔːr ɪt/',
      'You are the expert here, I will take your word for it.',
      array['idioms']
    )
) as v (english, portuguese, phonetic, example, tags)
where not exists (
  select 1
  from public.flashcards f
  where lower(f.english) = lower(v.english)
);

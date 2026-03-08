"use strict";
/**
 * Chart Analysis Service
 * US-13: Understand Chart Components
 *
 * Provides detailed interpretations for planets, signs, houses, and aspects
 * Supports Bulgarian (bg) and English (en) languages
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.analyzeChart = analyzeChart;
// ============================================
// Planet Meanings
// ============================================
const PLANET_MEANINGS = {
    sun: {
        name: 'Sun',
        nameBg: 'Слънце',
        symbol: '☉',
        basic: 'Represents your core identity, ego, and conscious self.',
        basicBg: 'Представлява вашата основна идентичност, его и съзнателно аз.',
        intermediate: 'The Sun shows your life purpose, creative expression, and where you shine brightest. It represents your father figure and authority figures.',
        intermediateBg: 'Слънцето показва вашата житейска цел, творческо изразяване и къде блестите най-силно. Представлява баща фигура и авторитетни личности.',
        advanced: 'The Sun in your chart is the integrating force of your personality. It\'s where you develop consciousness and individuality. The house and sign show the area of life and style through which you seek recognition and express your unique identity.',
        advancedBg: 'Слънцето във вашата карта е интегриращата сила на вашата личност. Това е мястото, където развивате съзнание и индивидуалност. Домът и знакът показват областта от живота и стила, чрез които търсите признание и изразявате уникалната си идентичност.',
        keywords: ['identity', 'ego', 'creativity', 'vitality', 'self-expression'],
        keywordsBg: ['идентичност', 'его', 'творчество', 'жизненост', 'самоизразяване'],
    },
    moon: {
        name: 'Moon',
        nameBg: 'Луна',
        symbol: '☽',
        basic: 'Represents your emotions, instincts, and inner self.',
        basicBg: 'Представлява вашите емоции, инстинкти и вътрешно аз.',
        intermediate: 'The Moon reveals your emotional needs, habits, and how you nurture yourself and others. It represents your mother figure and early home environment.',
        intermediateBg: 'Луната разкрива вашите емоционални нужди, навици и как се грижите за себе си и другите. Представлява майка фигура и ранната домашна среда.',
        advanced: 'The Moon governs your subconscious patterns and emotional responses formed in early childhood. It shows what makes you feel safe and secure, your instinctual reactions, and the type of environment where you can best relax and be yourself.',
        advancedBg: 'Луната управлява вашите подсъзнателни модели и емоционални реакции, оформени в ранното детство. Показва какво ви кара да се чувствате сигурни и защитени, вашите инстинктивни реакции и типа среда, в която можете най-добре да се отпуснете и да бъдете себе си.',
        keywords: ['emotions', 'instincts', 'nurturing', 'home', 'subconscious'],
        keywordsBg: ['емоции', 'инстинкти', 'грижа', 'дом', 'подсъзнание'],
    },
    rising: {
        name: 'Rising (Ascendant)',
        nameBg: 'Асцендент',
        symbol: 'ASC',
        basic: 'Represents your outer personality and how others perceive you.',
        basicBg: 'Представлява вашата външна личност и как другите ви възприемат.',
        intermediate: 'The Rising sign is the mask you wear and your approach to new situations. It colors your entire chart and influences your physical appearance.',
        intermediateBg: 'Асцендентът е маската, която носите, и вашият подход към нови ситуации. Той оцветява цялата ви карта и влияе на физическата ви външност.',
        advanced: 'The Ascendant is the lens through which all other chart energies are filtered. It represents your immediate, instinctive response to the environment and the first impression you make. It\'s the point of self-awareness and the beginning of your evolutionary journey.',
        advancedBg: 'Асцендентът е лещата, през която се филтрират всички други енергии в картата. Представлява вашата незабавна, инстинктивна реакция към средата и първото впечатление, което създавате. Това е точката на самосъзнание и началото на вашето еволюционно пътешествие.',
        keywords: ['personality', 'appearance', 'first impressions', 'approach to life'],
        keywordsBg: ['личност', 'външност', 'първи впечатления', 'подход към живота'],
    },
    mercury: {
        name: 'Mercury',
        nameBg: 'Меркурий',
        symbol: '☿',
        basic: 'Represents communication, thinking, and learning.',
        basicBg: 'Представлява комуникацията, мисленето и ученето.',
        intermediate: 'Mercury shows how you process information, communicate ideas, and make decisions. It governs short trips, siblings, and early education.',
        intermediateBg: 'Меркурий показва как обработвате информация, комуникирате идеи и вземате решения. Управлява кратки пътувания, братя и сестри и ранното образование.',
        advanced: 'Mercury represents your mental framework and how you conceptualize reality. Its placement reveals your learning style, communication patterns, and the types of mental activities that stimulate you. It connects the solar principle of consciousness with the lunar principle of emotion.',
        advancedBg: 'Меркурий представлява вашата умствена рамка и как концептуализирате реалността. Неговото разположение разкрива вашия стил на учене, комуникационни модели и видовете умствени дейности, които ви стимулират. Той свързва слънчевия принцип на съзнанието с лунния принцип на емоцията.',
        keywords: ['communication', 'thinking', 'learning', 'travel', 'siblings'],
        keywordsBg: ['комуникация', 'мислене', 'учене', 'пътуване', 'братя и сестри'],
    },
    venus: {
        name: 'Venus',
        nameBg: 'Венера',
        symbol: '♀',
        basic: 'Represents love, beauty, and values.',
        basicBg: 'Представлява любовта, красотата и ценностите.',
        intermediate: 'Venus shows how you give and receive love, what you find beautiful, and your approach to relationships and money. It governs pleasure, art, and social grace.',
        intermediateBg: 'Венера показва как давате и получавате любов, какво намирате за красиво и вашия подход към взаимоотношенията и парите. Управлява удоволствието, изкуството и социалния такт.',
        advanced: 'Venus represents your capacity for attraction and what you value in life. It shows your aesthetic sense, relationship needs, and how you experience pleasure. Venus energy seeks harmony, balance, and connection through appreciation of beauty and worth.',
        advancedBg: 'Венера представлява вашия капацитет за привличане и това, което цените в живота. Показва вашия естетичен усет, нужди от взаимоотношения и как изпитвате удоволствие. Венерианската енергия търси хармония, баланс и връзка чрез оценяване на красотата и стойността.',
        keywords: ['love', 'beauty', 'values', 'relationships', 'money'],
        keywordsBg: ['любов', 'красота', 'ценности', 'взаимоотношения', 'пари'],
    },
    mars: {
        name: 'Mars',
        nameBg: 'Марс',
        symbol: '♂',
        basic: 'Represents energy, action, and desire.',
        basicBg: 'Представлява енергията, действието и желанието.',
        intermediate: 'Mars shows how you assert yourself, pursue goals, and handle conflict. It governs physical energy, sexuality, and competitive drive.',
        intermediateBg: 'Марс показва как се утвърждавате, преследвате цели и управлявате конфликти. Управлява физическата енергия, сексуалността и състезателния дух.',
        advanced: 'Mars represents your will to exist and your capacity to take action. It shows how you channel your desires into concrete results, your fighting style, and what motivates you to act. Mars energy is raw life force that needs constructive outlets.',
        advancedBg: 'Марс представлява вашата воля за съществуване и вашия капацитет за действие. Показва как канализирате желанията си в конкретни резултати, вашия стил на борба и какво ви мотивира да действате. Марсианската енергия е сурова жизнена сила, която се нуждае от конструктивни отдушници.',
        keywords: ['energy', 'action', 'desire', 'assertion', 'conflict'],
        keywordsBg: ['енергия', 'действие', 'желание', 'утвърждаване', 'конфликт'],
    },
    jupiter: {
        name: 'Jupiter',
        nameBg: 'Юпитер',
        symbol: '♃',
        basic: 'Represents expansion, luck, and wisdom.',
        basicBg: 'Представлява разширяването, късмета и мъдростта.',
        intermediate: 'Jupiter shows where you experience growth, abundance, and good fortune. It governs higher education, travel, philosophy, and spirituality.',
        intermediateBg: 'Юпитер показва къде изпитвате растеж, изобилие и късмет. Управлява висшето образование, пътуванията, философията и духовността.',
        advanced: 'Jupiter represents your search for meaning and your capacity for faith and optimism. It shows where you can expand your horizons and experience growth. Jupiter energy seeks to understand the bigger picture and find purpose through wisdom.',
        advancedBg: 'Юпитер представлява вашето търсене на смисъл и вашия капацитет за вяра и оптимизъм. Показва къде можете да разширите хоризонтите си и да изпитате растеж. Юпитерианската енергия се стреми да разбере голямата картина и да намери цел чрез мъдрост.',
        keywords: ['expansion', 'luck', 'wisdom', 'growth', 'abundance'],
        keywordsBg: ['разширяване', 'късмет', 'мъдрост', 'растеж', 'изобилие'],
    },
    saturn: {
        name: 'Saturn',
        nameBg: 'Сатурн',
        symbol: '♄',
        basic: 'Represents discipline, responsibility, and limitations.',
        basicBg: 'Представлява дисциплината, отговорността и ограниченията.',
        intermediate: 'Saturn shows where you face challenges, learn lessons, and build lasting structures. It governs career, authority, time, and karma.',
        intermediateBg: 'Сатурн показва къде се сблъсквате с предизвикателства, учите уроци и изграждате трайни структури. Управлява кариерата, авторитета, времето и кармата.',
        advanced: 'Saturn represents the principle of crystallization and the lessons necessary for maturity. It shows where you must work hard, accept responsibility, and develop mastery. Saturn energy teaches through limitation, delay, and the confrontation with reality.',
        advancedBg: 'Сатурн представлява принципа на кристализация и уроците, необходими за зрялост. Показва къде трябва да работите усилено, да приемете отговорност и да развиете майсторство. Сатурновата енергия учи чрез ограничение, забавяне и сблъсък с реалността.',
        keywords: ['discipline', 'responsibility', 'limitations', 'career', 'karma'],
        keywordsBg: ['дисциплина', 'отговорност', 'ограничения', 'кариера', 'карма'],
    },
    uranus: {
        name: 'Uranus',
        nameBg: 'Уран',
        symbol: '⛢',
        basic: 'Represents innovation, freedom, and sudden change.',
        basicBg: 'Представлява иновациите, свободата и внезапните промени.',
        intermediate: 'Uranus shows where you seek freedom, express individuality, and experience breakthroughs. It governs technology, rebellion, and sudden insights.',
        intermediateBg: 'Уран показва къде търсите свобода, изразявате индивидуалност и изпитвате проблясъци. Управлява технологиите, бунта и внезапните прозрения.',
        advanced: 'Uranus represents the principle of awakening and liberation from old patterns. It shows where you need to break free from convention and express your unique genius. Uranus energy is unpredictable, revolutionary, and brings sudden shifts in consciousness.',
        advancedBg: 'Уран представлява принципа на пробуждане и освобождаване от стари модели. Показва къде трябва да се освободите от конвенциите и да изразите своя уникален гений. Урановата енергия е непредсказуема, революционна и носи внезапни промени в съзнанието.',
        keywords: ['innovation', 'freedom', 'change', 'rebellion', 'genius'],
        keywordsBg: ['иновации', 'свобода', 'промяна', 'бунт', 'гениалност'],
    },
    neptune: {
        name: 'Neptune',
        nameBg: 'Нептун',
        symbol: '♆',
        basic: 'Represents dreams, intuition, and spirituality.',
        basicBg: 'Представлява мечтите, интуицията и духовността.',
        intermediate: 'Neptune shows where you experience compassion, imagination, and connection to the divine. It governs dreams, illusions, art, and mysticism.',
        intermediateBg: 'Нептун показва къде изпитвате състрадание, въображение и връзка с божественото. Управлява мечтите, илюзиите, изкуството и мистицизма.',
        advanced: 'Neptune represents the principle of transcendence and dissolution of ego boundaries. It shows where you seek to merge with something greater and experience unity. Neptune energy can manifest as inspiration or illusion, requiring discernment.',
        advancedBg: 'Нептун представлява принципа на трансценденция и разтваряне на его границите. Показва къде търсите да се слеете с нещо по-голямо и да изпитате единство. Нептуновата енергия може да се прояви като вдъхновение или илюзия, изисквайки разборност.',
        keywords: ['dreams', 'intuition', 'spirituality', 'compassion', 'illusion'],
        keywordsBg: ['мечти', 'интуиция', 'духовност', 'състрадание', 'илюзия'],
    },
    pluto: {
        name: 'Pluto',
        nameBg: 'Плутон',
        symbol: '♇',
        basic: 'Represents transformation, power, and rebirth.',
        basicBg: 'Представлява трансформацията, властта и прераждането.',
        intermediate: 'Pluto shows where you experience deep transformation, power struggles, and regeneration. It governs death, rebirth, hidden things, and collective evolution.',
        intermediateBg: 'Плутон показва къде изпитвате дълбока трансформация, борби за власт и регенерация. Управлява смъртта, прераждането, скритите неща и колективната еволюция.',
        advanced: 'Pluto represents the principle of metamorphosis and the cycle of death and rebirth. It shows where you must undergo profound transformation and release what no longer serves you. Pluto energy is intense, obsessive, and ultimately liberating.',
        advancedBg: 'Плутон представлява принципа на метаморфозата и цикъла на смъртта и прераждането. Показва къде трябва да претърпите дълбока трансформация и да освободите това, което вече не ви служи. Плутоновата енергия е интензивна, обсебваща и в крайна сметка освобождаваща.',
        keywords: ['transformation', 'power', 'rebirth', 'intensity', 'secrets'],
        keywordsBg: ['трансформация', 'власт', 'прераждане', 'интензивност', 'тайни'],
    },
    northNode: {
        name: 'North Node',
        nameBg: 'Северен възел',
        symbol: '☊',
        basic: 'Represents your soul\'s growth direction and life lessons.',
        basicBg: 'Представлява посоката на растеж на вашата душа и житейските уроци.',
        intermediate: 'The North Node shows qualities you need to develop in this lifetime. It represents your karmic path and areas where you must stretch beyond comfort.',
        intermediateBg: 'Северният възел показва качества, които трябва да развиете в този живот. Представлява вашата кармичен път и области, където трябва да се разтегнете извън зоната на комфорт.',
        advanced: 'The North Node represents the soul\'s evolutionary intention for this lifetime. It shows the qualities and experiences you need to embrace for spiritual growth. The South Node shows past-life gifts and patterns to move beyond.',
        advancedBg: 'Северният възел представлява еволюционното намерение на душата за този живот. Показва качествата и опитите, които трябва да прегърнете за духовен растеж. Южният възел показва дарби и модели от минали животи, които трябва да надскочите.',
        keywords: ['growth', 'destiny', 'lessons', 'evolution', 'purpose'],
        keywordsBg: ['растеж', 'съдба', 'уроци', 'еволюция', 'цел'],
    },
    southNode: {
        name: 'South Node',
        nameBg: 'Южен възел',
        symbol: '☋',
        basic: 'Represents past-life talents and comfort zone.',
        basicBg: 'Представлява таланти от минали животи и зона на комфорт.',
        intermediate: 'The South Node shows innate abilities and familiar patterns from past lives. While comfortable, over-reliance on these can limit growth.',
        intermediateBg: 'Южният възел показва вродени способности и познати модели от минали животи. Въпреки че са комфортни, прекомерното разчитане на тях може да ограничи растежа.',
        advanced: 'The South Node represents past-life achievements and ingrained patterns that you bring into this incarnation. While these are natural strengths, the evolutionary journey requires moving toward the North Node\'s unfamiliar territory.',
        advancedBg: 'Южният възел представлява постижения от минали животи и вкоренени модели, които носите в това въплъщение. Въпреки че това са естествени силни страни, еволюционното пътешествие изисква движение към непознатата територия на Северния възел.',
        keywords: ['past lives', 'talents', 'comfort zone', 'innate abilities'],
        keywordsBg: ['минали животи', 'таланти', 'зона на комфорт', 'вродени способности'],
    },
    chiron: {
        name: 'Chiron',
        nameBg: 'Хирон',
        symbol: '⚷',
        basic: 'Represents your deepest wound and healing gift.',
        basicBg: 'Представлява вашата най-дълбока рана и дарба за изцеление.',
        intermediate: 'Chiron shows where you experience pain and vulnerability, but also where you can heal yourself and others. It represents the wounded healer archetype.',
        intermediateBg: 'Хирон показва къде изпитвате болка и уязвимост, но също така къде можете да излекувате себе си и другите. Представлява архетипа на ранения лечител.',
        advanced: 'Chiron represents the bridge between the personal and transpersonal planets. It shows your core wound that becomes your greatest gift through the journey of healing. Chiron\'s placement reveals how you can transform suffering into wisdom and compassion.',
        advancedBg: 'Хирон представлява моста между личните и трансперсоналните планети. Показва вашата основна рана, която става вашата най-голяма дарба чрез пътешествието на изцеление. Разположението на Хирон разкрива как можете да трансформирате страданието в мъдрост и състрадание.',
        keywords: ['wound', 'healing', 'teaching', 'wisdom', 'vulnerability'],
        keywordsBg: ['рана', 'изцеление', 'учение', 'мъдрост', 'уязвимост'],
    },
};
// ============================================
// Sign Meanings in Houses
// ============================================
const SIGN_IN_HOUSE_MEANINGS = {
    Aries: {
        1: {
            basic: 'You have a direct, energetic approach to life and come across as confident and assertive.',
            basicBg: 'Имате директен, енергичен подход към живота и се възприемате като уверен и решителен.',
            intermediate: 'With Aries rising, you project a pioneering spirit and natural leadership qualities. You act first and think later, which brings both successes and lessons.',
            intermediateBg: 'С Асцендент Овен, излъчвате пионерски дух и естествени лидерски качества. Действате първо и мислите после, което носи както успехи, така и уроци.',
        },
        2: {
            basic: 'You are motivated to earn money through your own efforts and value independence.',
            basicBg: 'Мотивирани сте да печелите пари чрез собствените си усилия и цените независимостта.',
            intermediate: 'Financial independence is crucial to your sense of self-worth. You may be impulsive with money but quick to find new earning opportunities.',
            intermediateBg: 'Финансовата независимост е ключова за вашето самочувствие. Може да сте импулсивни с парите, но бързи в намирането на нови възможности за печелене.',
        },
        3: {
            basic: 'You communicate directly and enjoy mental challenges and debates.',
            basicBg: 'Комуникирате директно и се наслаждавате на умствени предизвикателства и дебати.',
            intermediate: 'Your mind is quick and competitive. You learn best through direct experience and may have a talent for sales or persuasion.',
            intermediateBg: 'Умът ви е бърз и състезателен. Учете се най-добре чрез директен опит и може да имате талант за продажби или убеждаване.',
        },
        // Add more houses as needed...
    },
    // Add more signs as needed...
};
// ============================================
// House Meanings
// ============================================
const HOUSE_MEANINGS = {
    1: {
        basic: 'Self, identity, physical appearance, and how you present yourself to the world.',
        basicBg: 'Аз, идентичност, физическа външност и как се представяте пред света.',
        intermediate: 'The 1st house represents your personality, physical body, and approach to life. It shows how others see you and your first impressions.',
        intermediateBg: 'Първият дом представлява вашата личност, физическо тяло и подход към живота. Показва как другите ви виждат и първите впечатления.',
        advanced: 'The Ascendant and 1st house are the gateway to your chart, representing the point of incarnation. This is where the soul enters physical form and begins its journey. The sign on the cusp colors your entire life experience.',
        advancedBg: 'Асцендентът и първият дом са входът към вашата карта, представляващи точката на въплъщение. Тук душата влиза във физическа форма и започва своето пътешествие. Знакът на върха оцветява целия ви житейски опит.',
        keywords: ['self', 'identity', 'appearance', 'first impressions', 'beginnings'],
        keywordsBg: ['аз', 'идентичност', 'външност', 'първи впечатления', 'началo'],
    },
    2: {
        basic: 'Money, possessions, values, and sense of self-worth.',
        basicBg: 'Пари, притежания, ценности и чувство за собствена стойност.',
        intermediate: 'The 2nd house shows your relationship with material resources, what you value, and how you build security. It governs earned income and talents.',
        intermediateBg: 'Вторият дом показва вашата връзка с материалните ресурси, какво цените и как изграждате сигурност. Управлява доходите и талантите.',
        advanced: 'The 2nd house represents the consolidation of identity established in the 1st house. It shows what you need to feel secure and how you define value. This is the house of resources - both internal (self-worth) and external (possessions).',
        advancedBg: 'Вторият дом представлява консолидацията на идентичността, установена в първия дом. Показва от какво имате нужда, за да се чувствате сигурни и как дефинирате стойността. Това е домът на ресурсите - както вътрешни (самочувствие), така и външни (притежания).',
        keywords: ['money', 'possessions', 'values', 'self-worth', 'talents'],
        keywordsBg: ['пари', 'притежания', 'ценности', 'самочувствие', 'таланти'],
    },
    3: {
        basic: 'Communication, siblings, short trips, and early education.',
        basicBg: 'Комуникация, братя и сестри, кратки пътувания и ранно образование.',
        intermediate: 'The 3rd house governs how you think, learn, and communicate. It represents your immediate environment, neighbors, and everyday interactions.',
        intermediateBg: 'Третият дом управлява как мислите, учите и комуникирате. Представлява вашата непосредствена среда, съседи и ежедневни взаимодействия.',
        advanced: 'The 3rd house represents the development of mental faculties and the ability to categorize experience. It shows how you process and share information, forming the basis for all higher learning and communication.',
        advancedBg: 'Третият дом представлява развитието на умствените способности и способността да категоризирате опита. Показва как обработвате и споделяте информация, формирайки основата за цялото висше учене и комуникация.',
        keywords: ['communication', 'siblings', 'learning', 'short trips', 'mind'],
        keywordsBg: ['комуникация', 'братя и сестри', 'учене', 'кратки пътувания', 'ум'],
    },
    4: {
        basic: 'Home, family, roots, and emotional foundations.',
        basicBg: 'Дом, семейство, корени и емоционални основи.',
        intermediate: 'The 4th house represents your private life, family background, and sense of belonging. It governs real estate and your relationship with parents.',
        intermediateBg: 'Четвъртият дом представлява вашия личен живот, семейен произход и чувство за принадлежност. Управлява недвижимите имоти и връзката ви с родителите.',
        advanced: 'The 4th house is the foundation of your chart, representing your psychological roots and the end of life. It shows the emotional patterns inherited from family and the private sanctuary you create for yourself.',
        advancedBg: 'Четвъртият дом е основата на вашата карта, представляваща вашите психологически корени и края на живота. Показва емоционалните модели, наследени от семейството, и личното светилище, което създавате за себе си.',
        keywords: ['home', 'family', 'roots', 'emotions', 'privacy'],
        keywordsBg: ['дом', 'семейство', 'корени', 'емоции', 'уединение'],
    },
    5: {
        basic: 'Creativity, children, romance, and self-expression.',
        basicBg: 'Творчество, деца, романтика и самоизразяване.',
        intermediate: 'The 5th house governs creative expression, children, romance, and recreational activities. It shows how you play, take risks, and enjoy life.',
        intermediateBg: 'Петият дом управлява творческото изразяване, децата, романтиката и развлекателните дейности. Показва как си играете, поемате рискове и се наслаждавате на живота.',
        advanced: 'The 5th house represents the creative projection of self, whether through artistic expression, children, or romantic love. It shows your capacity for joy, spontaneity, and the willingness to take risks for growth.',
        advancedBg: 'Петият дом представлява творческата проекция на аз-то, било то чрез художествено изразяване, деца или романтична любов. Показва вашия капацитет за радост, спонтанност и готовност да поемате рискове за растеж.',
        keywords: ['creativity', 'children', 'romance', 'play', 'self-expression'],
        keywordsBg: ['творчество', 'деца', 'романтика', 'игра', 'самоизразяване'],
    },
    6: {
        basic: 'Work, health, daily routines, and service.',
        basicBg: 'Работа, здраве, ежедневни руини и служба.',
        intermediate: 'The 6th house shows your work habits, health matters, and daily routines. It governs how you serve others and maintain your physical well-being.',
        intermediateBg: 'Шестият дом показва вашите работни навици, здравни въпроси и ежедневни рутини. Управлява как служите на другите и поддържате физическото си благополучие.',
        advanced: 'The 6th house represents the refinement of self through daily practice and service. It shows how you integrate spiritual principles into mundane activities and the relationship between mind and body.',
        advancedBg: 'Шестият дом представлява усъвършенстването на аз-то чрез ежедневна практика и служба. Показва как интегрирате духовни принципи в обикновените дейности и връзката между ум и тяло.',
        keywords: ['work', 'health', 'routine', 'service', 'self-improvement'],
        keywordsBg: ['работа', 'здраве', 'рутина', 'служба', 'самоусъвършенстване'],
    },
    7: {
        basic: 'Partnerships, marriage, and one-on-one relationships.',
        basicBg: 'Партньорство, брак и взаимоотношения едно на едно.',
        intermediate: 'The 7th house governs all committed partnerships, both personal and business. It shows what you seek in others and how you relate one-on-one.',
        intermediateBg: 'Седмият дом управлява всички ангажирани партньорства, както лични, така и бизнес. Показва какво търсите в другите и как се отнасяте едно на едно.',
        advanced: 'The 7th house represents the encounter with the "other" and the mirror they provide for self-understanding. It shows projected qualities and the lessons learned through relationship dynamics.',
        advancedBg: 'Седмият дом представлява срещата с "другия" и огледалото, което той предоставя за саморазбиране. Показва проектирани качества и уроците, научени чрез динамиката на взаимоотношенията.',
        keywords: ['partnerships', 'marriage', 'relationships', 'open enemies', 'contracts'],
        keywordsBg: ['партньорства', 'брак', 'взаимоотношения', 'явни врагове', 'договори'],
    },
    8: {
        basic: 'Transformation, shared resources, intimacy, and rebirth.',
        basicBg: 'Трансформация, споделени ресурси, интимност и прераждане.',
        intermediate: 'The 8th house governs deep transformation, inheritance, other people\'s money, and intimate connections. It represents the cycle of death and rebirth.',
        intermediateBg: 'Осмият дом управлява дълбока трансформация, наследство, пари на други хора и интимни връзки. Представлява цикъла на смърт и прераждане.',
        advanced: 'The 8th house represents the transformation of self through merging with others. It shows where you must surrender control and trust in the process of change. This is the house of alchemy and psychological rebirth.',
        advancedBg: 'Осмият дом представлява трансформацията на аз-то чрез сливане с другите. Показва къде трябва да се предадете на контрола и да се доверите в процеса на промяна. Това е домът на алхимията и психологическото прераждане.',
        keywords: ['transformation', 'intimacy', 'shared resources', 'death', 'rebirth'],
        keywordsBg: ['трансформация', 'интимност', 'споделени ресурси', 'смърт', 'прераждане'],
    },
    9: {
        basic: 'Higher education, philosophy, travel, and belief systems.',
        basicBg: 'Висше образование, философия, пътувания и системи от вярвания.',
        intermediate: 'The 9th house governs your search for meaning through higher education, travel, and spiritual exploration. It represents your worldview and ethics.',
        intermediateBg: 'Деветият дом управлява вашето търсене на смисъл чрез висше образование, пътувания и духовно изследване. Представлява вашето световъзприятие и етика.',
        advanced: 'The 9th house represents the expansion of consciousness beyond personal concerns. It shows your quest for truth and the philosophical framework through which you interpret life\'s meaning.',
        advancedBg: 'Деветият дом представлява разширяването на съзнанието извън личните грижи. Показва вашето търсене на истината и философската рамка, чрез която интерпретирате смисъла на живота.',
        keywords: ['philosophy', 'travel', 'higher education', 'spirituality', 'truth'],
        keywordsBg: ['философия', 'пътувания', 'висше образование', 'духовност', 'истина'],
    },
    10: {
        basic: 'Career, public image, authority, and achievements.',
        basicBg: 'Кариера, публичен образ, авторитет и постижения.',
        intermediate: 'The 10th house represents your career, public reputation, and contribution to society. It shows your ambitions and relationship with authority figures.',
        intermediateBg: 'Десетият дом представлява вашата кариера, публична репутация и принос към обществото. Показва вашите амбиции и връзка с авторитетни фигури.',
        advanced: 'The 10th house is the culmination of the chart, representing your life\'s work and legacy. It shows the role you are meant to play in the collective and how you integrate personal identity with social responsibility.',
        advancedBg: 'Десетият дом е кулминацията на картата, представляваща вашето жизнено дело и наследство. Показва ролята, която сте предназначени да играете в колектива и как интегрирате личната идентичност с социална отговорност.',
        keywords: ['career', 'public image', 'authority', 'achievements', 'reputation'],
        keywordsBg: ['кариера', 'публичен образ', 'авторитет', 'постижения', 'репутация'],
    },
    11: {
        basic: 'Friends, groups, social networks, and future goals.',
        basicBg: 'Приятели, групи, социални мрежи и бъдещи цели.',
        intermediate: 'The 11th house governs friendships, group affiliations, and your hopes for the future. It shows how you connect with like-minded individuals.',
        intermediateBg: 'Единадесетият дом управлява приятелствата, груповите принадлежности и вашите надежди за бъдещето. Показва как се свързвате с единомисленици.',
        advanced: 'The 11th house represents the transcendence of personal ego through group consciousness. It shows your capacity to work toward collective goals and the vision you hold for humanity\'s future.',
        advancedBg: 'Единадесетият дом представлява трансценденцията на личното его чрез групово съзнание. Показва вашия капацитет да работите към колективни цели и визията, която държите за бъдещето на човечеството.',
        keywords: ['friends', 'groups', 'social networks', 'goals', 'humanitarian'],
        keywordsBg: ['приятели', 'групи', 'социални мрежи', 'цели', 'хуманитарен'],
    },
    12: {
        basic: 'Spirituality, subconscious, hidden matters, and self-undoing.',
        basicBg: 'Духовност, подсъзнание, скрити въпроси и самоунищожение.',
        intermediate: 'The 12th house governs the unconscious mind, hidden strengths, and spiritual retreat. It represents karma, institutions, and selfless service.',
        intermediateBg: 'Дванадесетият дом управлява несъзнателния ум, скрити сили и духовно оттегляне. Представлява карма, институции и безкористна служба.',
        advanced: 'The 12th house represents the dissolution of ego boundaries and return to the source. It shows where you must confront the unconscious and integrate shadow aspects of self. This is the house of spiritual liberation.',
        advancedBg: 'Дванадесетият дом представлява разтварянето на его границите и връщане към източника. Показва къде трябва да се сблъскате с несъзнателното и да интегрирате сенчести аспекти на аз-то. Това е домът на духовното освобождение.',
        keywords: ['spirituality', 'subconscious', 'hidden', 'karma', 'transcendence'],
        keywordsBg: ['духовност', 'подсъзнание', 'скрито', 'карма', 'трансценденция'],
    },
};
// ============================================
// Aspect Meanings
// ============================================
const ASPECT_MEANINGS = {
    conjunction: {
        basic: 'Planets are close together, blending their energies.',
        basicBg: 'Планетите са близо една до друга, смесвайки енергиите си.',
        intermediate: 'Conjunctions combine planetary energies intensely. The planets work as a unit, for better or worse, depending on their compatibility.',
        intermediateBg: 'Съвпадите комбират планетарните енергии интензивно. Планетите работят като едно цяло, за по-добро или по-лошо, в зависимост от тяхната съвместимост.',
        advanced: 'The conjunction represents a focal point of energy where the archetypal principles merge. Integration and fusion occur, requiring conscious awareness to express both planetary energies constructively.',
        advancedBg: 'Съвпадът представлява фокусна точка на енергия, където архетипните принципи се сливат. Настъпва интеграция и синтез, изискващи съзнателно осъзнаване за конструктивно изразяване на двете планетарни енергии.',
        keywords: ['fusion', 'integration', 'intensity', 'combination'],
        keywordsBg: ['сливане', 'интеграция', 'интензивност', 'комбинация'],
    },
    sextile: {
        basic: 'A harmonious aspect offering opportunities for growth.',
        basicBg: 'Хармоничен аспект, предлагащ възможности за растеж.',
        intermediate: 'Sextiles represent potential and opportunity. They require conscious effort to activate but offer smooth, supportive energy.',
        intermediateBg: 'Секстилите представляват потенциал и възможност. Изискват съзнателно усилие за активиране, но предлагат гладка, подкрепяща енергия.',
        advanced: 'The sextile represents complementary energies that can be activated through conscious choice. It shows areas of natural talent that require effort to fully develop.',
        advancedBg: 'Секстилът представлява допълващи се енергии, които могат да бъдат активирани чрез съзнателен избор. Показва области на естествен талант, които изискват усилие за пълно развитие.',
        keywords: ['opportunity', 'potential', 'talent', 'cooperation'],
        keywordsBg: ['възможност', 'потенциал', 'талант', 'сътрудничество'],
    },
    square: {
        basic: 'A challenging aspect creating tension and motivation.',
        basicBg: 'Предизвикателен аспект, създаващ напрежение и мотивация.',
        intermediate: 'Squares create friction that demands action. While challenging, they drive growth through conflict and the need for resolution.',
        intermediateBg: 'Квадратите създават триене, което изисква действие. Въпреки че са предизвикателни, те управляват растежа чрез конфликт и необходимост от разрешение.',
        advanced: 'The square represents the collision of incompatible energies that requires creative integration. It shows where you must overcome obstacles and develop new skills to resolve inner conflicts.',
        advancedBg: 'Квадратът представлява сблъсък на несъвместими енергии, който изисква творческа интеграция. Показва къде трябва да преодолеете препятствия и да развиете нови умения за разрешаване на вътрешни конфликти.',
        keywords: ['challenge', 'tension', 'growth', 'motivation'],
        keywordsBg: ['предизвикателство', 'напрежение', 'растеж', 'мотивация'],
    },
    trine: {
        basic: 'A harmonious aspect of ease and natural talent.',
        basicBg: 'Хармоничен аспект на лекота и естествен талант.',
        intermediate: 'Trines represent flowing energy and natural abilities. They are supportive but can lead to complacency if not actively used.',
        intermediateBg: 'Тригоните представляват течаща енергия и естествени способности. Те са подкрепящи, но могат да доведат до самоудовлетворение, ако не се използват активно.',
        advanced: 'The trine represents gifts and talents that come naturally. It shows where energy flows effortlessly, but requires conscious effort to avoid taking blessings for granted.',
        advancedBg: 'Тригонът представлява дарби и таланти, които идват естествено. Показва къде енергията тече без усилие, но изисква съзнателно усилие, за да се избегне приемането на благата за даденост.',
        keywords: ['harmony', 'ease', 'talent', 'flow'],
        keywordsBg: ['хармония', 'лекота', 'талант', 'поток'],
    },
    opposition: {
        basic: 'Planets across from each other, creating awareness through polarity.',
        basicBg: 'Планетите са срещуположни, създавайки осъзнатост чрез полярност.',
        intermediate: 'Oppositions represent awareness through relationships. They show where you project qualities onto others and need to find balance.',
        intermediateBg: 'Опозициите представляват осъзнатост чрез взаимоотношения. Показват къде проектирате качества върху другите и трябва да намерите баланс.',
        advanced: 'The opposition represents complementary opposites that need integration. It shows where you must acknowledge both sides of an issue and find a middle path.',
        advancedBg: 'Опозицията представлява допълващи се противоположности, които се нуждаят от интеграция. Показва къде трябва да признаете и двете страни на един въпрос и да намерите среден път.',
        keywords: ['awareness', 'balance', 'polarity', 'relationships'],
        keywordsBg: ['осъзнатост', 'баланс', 'полярност', 'взаимоотношения'],
    },
    quincunx: {
        basic: 'An adjustment aspect requiring adaptation.',
        basicBg: 'Аспект на адаптация, изискващ нагаждане.',
        intermediate: 'Quincunxes represent awkward adjustments. They show where you must make constant small changes to integrate incompatible energies.',
        intermediateBg: 'Квинкунксите представляват неудобни нагаждания. Показват къде трябва да правите постоянни малки промени, за да интегрирате несъвместими енергии.',
        advanced: 'The quincunx represents energies that have no common ground, requiring creative synthesis. It shows where you must transcend old patterns and develop new approaches.',
        advancedBg: 'Квинкунксът представлява енергии, които нямат обща основа, изисквайки творчески синтез. Показва къде трябва да трансцендирате стари модели и да развиете нови подходи.',
        keywords: ['adjustment', 'adaptation', 'healing', 'integration'],
        keywordsBg: ['нагаждане', 'адаптация', 'изцеление', 'интеграция'],
    },
};
// ============================================
// Planet in Sign Meanings
// ============================================
function getPlanetInSignInterpretation(planet, sign) {
    // Generic interpretations for planet in sign
    const planetData = PLANET_MEANINGS[planet];
    if (!planetData) {
        return {
            basic: `${planet} in ${sign} expresses the energy of ${planet} through the lens of ${sign}.`,
            basicBg: `${planet} в ${sign} изразява енергията на ${planet} през призмата на ${sign}.`,
            intermediate: `${planet} in ${sign} combines the archetypal energies in a unique way.`,
            intermediateBg: `${planet} в ${sign} комбинира архетипните енергии по уникален начин.`,
        };
    }
    // Simplified planet-sign interpretation
    return {
        basic: `${planetData.name} in ${sign} ${planetData.basic.toLowerCase()}`,
        basicBg: `${planetData.nameBg} в ${sign} ${planetData.basicBg.toLowerCase()}`,
        intermediate: `With ${planetData.name} in ${sign}, ${planetData.intermediate.toLowerCase()}`,
        intermediateBg: `С ${planetData.nameBg} в ${sign}, ${planetData.intermediateBg.toLowerCase()}`,
    };
}
// ============================================
// Main Analysis Functions
// ============================================
/**
 * Generate comprehensive chart analysis
 */
function analyzeChart(chart) {
    // Analyze all planets
    const planets = [];
    const planetKeys = ['sun', 'moon', 'rising', 'mercury', 'venus', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune', 'pluto', 'northNode', 'southNode', 'chiron'];
    for (const key of planetKeys) {
        const position = chart[key];
        if (!position)
            continue;
        const planetMeaning = PLANET_MEANINGS[key];
        if (!planetMeaning)
            continue;
        const signInterpretation = getPlanetInSignInterpretation(key, position.sign);
        planets.push({
            planet: key,
            planetName: planetMeaning.name,
            planetNameBg: planetMeaning.nameBg,
            sign: position.sign,
            signBg: position.signBg,
            degree: position.degree,
            house: position.house,
            retrograde: position.retrograde,
            symbol: position.symbol || planetMeaning.symbol,
            basic: signInterpretation.basic,
            basicBg: signInterpretation.basicBg,
            intermediate: signInterpretation.intermediate,
            intermediateBg: signInterpretation.intermediateBg,
            advanced: planetMeaning.advanced,
            advancedBg: planetMeaning.advancedBg,
            keywords: planetMeaning.keywords,
            keywordsBg: planetMeaning.keywordsBg,
        });
    }
    // Analyze houses
    const houses = chart.houses.map((house) => {
        const houseMeaning = HOUSE_MEANINGS[house.number];
        if (!houseMeaning) {
            return {
                number: house.number,
                sign: house.sign,
                signBg: house.signBg,
                degree: house.degree,
                basic: `House ${house.number} with ${house.sign} on the cusp.`,
                basicBg: `Дом ${house.number} с ${house.sign} на върха.`,
                intermediate: `House ${house.number} with ${house.sign} on the cusp.`,
                intermediateBg: `Дом ${house.number} с ${house.sign} на върха.`,
                advanced: `House ${house.number} with ${house.sign} on the cusp.`,
                advancedBg: `Дом ${house.number} с ${house.sign} на върха.`,
                keywords: [],
                keywordsBg: [],
            };
        }
        return {
            number: house.number,
            sign: house.sign,
            signBg: house.signBg,
            degree: house.degree,
            basic: houseMeaning.basic,
            basicBg: houseMeaning.basicBg,
            intermediate: houseMeaning.intermediate,
            intermediateBg: houseMeaning.intermediateBg,
            advanced: houseMeaning.advanced,
            advancedBg: houseMeaning.advancedBg,
            keywords: houseMeaning.keywords,
            keywordsBg: houseMeaning.keywordsBg,
        };
    });
    // Analyze aspects
    const aspects = chart.aspects.map((aspect) => {
        const aspectMeaning = ASPECT_MEANINGS[aspect.aspect.toLowerCase()];
        if (!aspectMeaning) {
            return {
                planet1: aspect.planet1,
                planet2: aspect.planet2,
                aspect: aspect.aspect,
                aspectBg: aspect.aspectBg,
                orb: aspect.orb,
                nature: aspect.nature,
                basic: `${aspect.planet1} ${aspect.aspect} ${aspect.planet2}`,
                basicBg: `${aspect.planet1} ${aspect.aspectBg} ${aspect.planet2}`,
                intermediate: `${aspect.planet1} ${aspect.aspect} ${aspect.planet2}`,
                intermediateBg: `${aspect.planet1} ${aspect.aspectBg} ${aspect.planet2}`,
                advanced: `${aspect.planet1} ${aspect.aspect} ${aspect.planet2}`,
                advancedBg: `${aspect.planet1} ${aspect.aspectBg} ${aspect.planet2}`,
                keywords: [],
                keywordsBg: [],
            };
        }
        return {
            planet1: aspect.planet1,
            planet2: aspect.planet2,
            aspect: aspect.aspect,
            aspectBg: aspect.aspectBg,
            orb: aspect.orb,
            nature: aspect.nature,
            basic: `${PLANET_MEANINGS[aspect.planet1]?.name || aspect.planet1} ${aspectMeaning.basic} ${PLANET_MEANINGS[aspect.planet2]?.name || aspect.planet2}`,
            basicBg: `${PLANET_MEANINGS[aspect.planet1]?.nameBg || aspect.planet1} ${aspectMeaning.basicBg} ${PLANET_MEANINGS[aspect.planet2]?.nameBg || aspect.planet2}`,
            intermediate: `${PLANET_MEANINGS[aspect.planet1]?.name || aspect.planet1} and ${PLANET_MEANINGS[aspect.planet2]?.name || aspect.planet2}: ${aspectMeaning.intermediate}`,
            intermediateBg: `${PLANET_MEANINGS[aspect.planet1]?.nameBg || aspect.planet1} и ${PLANET_MEANINGS[aspect.planet2]?.nameBg || aspect.planet2}: ${aspectMeaning.intermediateBg}`,
            advanced: aspectMeaning.advanced,
            advancedBg: aspectMeaning.advancedBg,
            keywords: aspectMeaning.keywords,
            keywordsBg: aspectMeaning.keywordsBg,
        };
    });
    // Extract big three
    const sunInterpretation = planets.find(p => p.planet === 'sun');
    const moonInterpretation = planets.find(p => p.planet === 'moon');
    const risingInterpretation = planets.find(p => p.planet === 'rising');
    return {
        planets,
        houses,
        aspects,
        bigThree: {
            sun: sunInterpretation,
            moon: moonInterpretation,
            rising: risingInterpretation,
        },
        elements: chart.elements,
        modalities: chart.modalities,
    };
}
//# sourceMappingURL=chart-analysis.js.map
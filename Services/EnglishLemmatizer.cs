namespace TranskriptOkuyucu.Services;

public class EnglishLemmatizer : IEnglishLemmatizer
{
    private static readonly Dictionary<string, string> IrregularForms = new(StringComparer.OrdinalIgnoreCase)
    {
        // Auxiliary & Common Irregular Verbs
        ["am"] = "be", ["is"] = "be", ["are"] = "be", ["was"] = "be", ["were"] = "be", ["been"] = "be", ["being"] = "be",
        ["has"] = "have", ["had"] = "have", ["having"] = "have",
        ["does"] = "do", ["did"] = "do", ["done"] = "do", ["doing"] = "do",
        ["goes"] = "go", ["went"] = "go", ["gone"] = "go", ["going"] = "go",
        ["says"] = "say", ["said"] = "say", ["saying"] = "say",
        ["makes"] = "make", ["made"] = "make", ["making"] = "make",
        ["gets"] = "get", ["got"] = "get", ["gotten"] = "get", ["getting"] = "get",
        ["knows"] = "know", ["knew"] = "know", ["known"] = "know", ["knowing"] = "know",
        ["thinks"] = "think", ["thought"] = "think", ["thinking"] = "think",
        ["takes"] = "take", ["took"] = "take", ["taken"] = "take", ["taking"] = "take",
        ["sees"] = "see", ["saw"] = "see", ["seen"] = "see", ["seeing"] = "see",
        ["comes"] = "come", ["came"] = "come", ["coming"] = "come",
        ["gives"] = "give", ["gave"] = "give", ["given"] = "give", ["giving"] = "give",
        ["finds"] = "find", ["found"] = "find", ["finding"] = "find",
        ["tells"] = "tell", ["told"] = "tell", ["telling"] = "tell",
        ["feels"] = "feel", ["felt"] = "feel", ["feeling"] = "feel",
        ["becomes"] = "become", ["became"] = "become", ["becoming"] = "become",
        ["leaves"] = "leave", ["left"] = "leave", ["leaving"] = "leave",
        ["puts"] = "put", ["putting"] = "put",
        ["means"] = "mean", ["meant"] = "mean", ["meaning"] = "mean",
        ["keeps"] = "keep", ["kept"] = "keep", ["keeping"] = "keep",
        ["lets"] = "let", ["letting"] = "let",
        ["begins"] = "begin", ["began"] = "begin", ["begun"] = "begin", ["beginning"] = "begin",
        ["shows"] = "show", ["showed"] = "show", ["shown"] = "show", ["showing"] = "show",
        ["hears"] = "hear", ["heard"] = "hear", ["hearing"] = "hear",
        ["runs"] = "run", ["ran"] = "run", ["running"] = "run",
        ["writes"] = "write", ["wrote"] = "write", ["written"] = "write", ["writing"] = "write",
        ["sits"] = "sit", ["sat"] = "sit", ["sitting"] = "sit",
        ["stands"] = "stand", ["stood"] = "stand", ["standing"] = "stand",
        ["loses"] = "lose", ["lost"] = "lose", ["losing"] = "lose",
        ["pays"] = "pay", ["paid"] = "pay", ["paying"] = "pay",
        ["meets"] = "meet", ["met"] = "meet", ["meeting"] = "meet",
        ["sets"] = "set", ["setting"] = "set",
        ["learns"] = "learn", ["learnt"] = "learn", ["learned"] = "learn",
        ["leads"] = "lead", ["led"] = "lead", ["leading"] = "lead",
        ["understands"] = "understand", ["understood"] = "understand",
        ["speaks"] = "speak", ["spoke"] = "speak", ["spoken"] = "speak", ["speaking"] = "speak",
        ["reads"] = "read", ["reading"] = "read",
        ["spends"] = "spend", ["spent"] = "spend", ["spending"] = "spend",
        ["grows"] = "grow", ["grew"] = "grow", ["grown"] = "grow", ["growing"] = "grow",
        ["wins"] = "win", ["won"] = "win", ["winning"] = "win",
        ["teaches"] = "teach", ["taught"] = "teach", ["teaching"] = "teach",
        ["buys"] = "buy", ["bought"] = "buy", ["buying"] = "buy",
        ["sends"] = "send", ["sent"] = "send", ["sending"] = "send",
        ["builds"] = "build", ["built"] = "build", ["building"] = "build",
        ["falls"] = "fall", ["fell"] = "fall", ["fallen"] = "fall", ["falling"] = "fall",
        ["cuts"] = "cut", ["cutting"] = "cut",
        ["sells"] = "sell", ["sold"] = "sell", ["selling"] = "sell",
        ["breaks"] = "break", ["broke"] = "break", ["broken"] = "break", ["breaking"] = "break",
        ["hits"] = "hit", ["hitting"] = "hit",
        ["eats"] = "eat", ["ate"] = "eat", ["eaten"] = "eat", ["eating"] = "eat",
        ["catches"] = "catch", ["caught"] = "catch", ["catching"] = "catch",
        ["draws"] = "draw", ["drew"] = "draw", ["drawn"] = "draw", ["drawing"] = "draw",
        ["chooses"] = "choose", ["chose"] = "choose", ["chosen"] = "choose", ["choosing"] = "choose",
        ["drinks"] = "drink", ["drank"] = "drink", ["drunk"] = "drink", ["drinking"] = "drink",
        ["drives"] = "drive", ["drove"] = "drive", ["driven"] = "drive", ["driving"] = "drive",
        ["flies"] = "fly", ["flew"] = "fly", ["flown"] = "fly", ["flying"] = "fly",
        ["forgets"] = "forget", ["forgot"] = "forget", ["forgotten"] = "forget",
        ["sleeps"] = "sleep", ["slept"] = "sleep", ["sleeping"] = "sleep",
        ["wears"] = "wear", ["wore"] = "wear", ["worn"] = "wear", ["wearing"] = "wear",
        ["brings"] = "bring", ["brought"] = "bring", ["bringing"] = "bring",
        ["holds"] = "hold", ["held"] = "hold", ["holding"] = "hold",
        ["lies"] = "lie", ["lay"] = "lie", ["lain"] = "lie",
        ["rises"] = "rise", ["rose"] = "rise", ["risen"] = "rise",
        ["sings"] = "sing", ["sang"] = "sing", ["sung"] = "sing",
        ["swims"] = "swim", ["swam"] = "swim", ["swum"] = "swim",
        ["wakes"] = "wake", ["woke"] = "wake", ["woken"] = "wake",
        ["blows"] = "blow", ["blew"] = "blow", ["blown"] = "blow",
        ["hides"] = "hide", ["hid"] = "hide", ["hidden"] = "hide",
        ["throws"] = "throw", ["threw"] = "throw", ["thrown"] = "throw",
        ["shakes"] = "shake", ["shook"] = "shake", ["shaken"] = "shake",
        ["steals"] = "steal", ["stole"] = "steal", ["stolen"] = "steal",
        ["swears"] = "swear", ["swore"] = "swear", ["sworn"] = "swear",
        ["bites"] = "bite", ["bit"] = "bite", ["bitten"] = "bite",
        ["freezes"] = "freeze", ["froze"] = "freeze", ["frozen"] = "freeze",
        ["hurts"] = "hurt", ["shuts"] = "shut",

        // Irregular Nouns & Adjectives / Adverbs
        ["better"] = "good", ["best"] = "good",
        ["worse"] = "bad", ["worst"] = "bad",
        ["more"] = "much", ["most"] = "much",
        ["less"] = "little", ["least"] = "little",
        ["farther"] = "far", ["further"] = "far",
        ["children"] = "child",
        ["men"] = "man",
        ["women"] = "woman",
        ["people"] = "person",
        ["feet"] = "foot",
        ["teeth"] = "tooth",
        ["geese"] = "goose",
        ["mice"] = "mouse",
        ["lives"] = "life",
        ["knives"] = "knife",
        ["wives"] = "wife",
        ["leaves"] = "leaf",
        ["halves"] = "half",
        ["calves"] = "calf",
        ["wolves"] = "wolf",
        ["thieves"] = "thief",
        ["criteria"] = "criterion",
        ["data"] = "datum",
        ["phenomena"] = "phenomenon",
        ["analyses"] = "analysis",
        ["crises"] = "crisis",
        ["hypotheses"] = "hypothesis"
    };

    public IEnumerable<string> GenerateStemmedVariants(string word)
    {
        if (string.IsNullOrWhiteSpace(word)) yield break;

        var lower = word.ToLowerInvariant();
        var variants = new HashSet<string>(StringComparer.OrdinalIgnoreCase);

        // 1. Direct Irregular Mapping (e.g. went -> go, bought -> buy, better -> good, children -> child)
        if (IrregularForms.TryGetValue(lower, out var rootForm))
        {
            variants.Add(rootForm);
        }

        // Contractions (don't -> do, they're -> they, it's -> it)
        if (lower.Contains('\'') || lower.Contains('’'))
        {
            var noApostrophe = lower.Replace("’", "'");
            if (noApostrophe.EndsWith("n't")) variants.Add(noApostrophe[..^3]);
            if (noApostrophe.EndsWith("'s")) variants.Add(noApostrophe[..^2]);
            if (noApostrophe.EndsWith("'re")) variants.Add(noApostrophe[..^3]);
            if (noApostrophe.EndsWith("'ve")) variants.Add(noApostrophe[..^3]);
            if (noApostrophe.EndsWith("'ll")) variants.Add(noApostrophe[..^3]);
            if (noApostrophe.EndsWith("'d")) variants.Add(noApostrophe[..^2]);
        }

        // -ing
        if (lower.EndsWith("ing") && lower.Length > 4)
        {
            var baseStem = lower[..^3];
            variants.Add(baseStem);
            variants.Add(baseStem + "e"); // e.g. making -> make, taking -> take
            if (baseStem.Length > 2 && baseStem[^1] == baseStem[^2]) // e.g. running -> run, swimming -> swim
            {
                variants.Add(baseStem[..^1]);
            }
            if (baseStem.EndsWith("y"))
            {
                variants.Add(baseStem[..^1] + "ie"); // e.g. lying -> lie
            }
        }

        // -ed
        if (lower.EndsWith("ed") && lower.Length > 3)
        {
            var baseStem = lower[..^2];
            variants.Add(baseStem);
            variants.Add(lower[..^1]); // e.g. created -> create, lived -> live
            if (baseStem.Length > 2 && baseStem[^1] == baseStem[^2]) // e.g. stopped -> stop, planned -> plan
            {
                variants.Add(baseStem[..^1]);
            }
            if (baseStem.EndsWith("i"))
            {
                variants.Add(baseStem[..^1] + "y"); // e.g. carried -> carry
            }
        }

        // -ies -> -y (e.g. studies -> study, flies -> fly)
        if (lower.EndsWith("ies") && lower.Length > 4)
        {
            variants.Add(lower[..^3] + "y");
        }

        // -es
        if (lower.EndsWith("es") && lower.Length > 3)
        {
            variants.Add(lower[..^2]); // e.g. watches -> watch, boxes -> box
            variants.Add(lower[..^1]);
        }

        // -s
        if (lower.EndsWith("s") && lower.Length > 2 && !lower.EndsWith("ss"))
        {
            variants.Add(lower[..^1]); // e.g. words -> word
        }

        // -ly
        if (lower.EndsWith("ly") && lower.Length > 3)
        {
            variants.Add(lower[..^2]); // e.g. clearly -> clear
            if (lower.EndsWith("ily") && lower.Length > 4)
            {
                variants.Add(lower[..^3] + "y"); // e.g. happily -> happy
            }
        }

        // -er / -est
        if (lower.EndsWith("er") && lower.Length > 3)
        {
            variants.Add(lower[..^2]);
            variants.Add(lower[..^1]);
        }
        if (lower.EndsWith("est") && lower.Length > 4)
        {
            variants.Add(lower[..^3]);
            variants.Add(lower[..^2]);
        }

        foreach (var v in variants)
        {
            yield return v;
        }
    }
}

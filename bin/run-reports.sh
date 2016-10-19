rm -fr reports
mkdir reports
generateCodeVocabulary.py --ext ts --out reports/src.vocabulary.json src
generateCodeVocabulary.py --ext ts --out reports/test.vocabulary.json test
generateCodeVocabulary.py --ext vocabulary.json --out reports/all.vocabulary.json reports
cloc.pl --force-lang-def=/Users/$USER/.cloc.lang_def --quiet --report-file=reports/src.cloc.txt src
cloc.pl --force-lang-def=/Users/$USER/.cloc.lang_def --quiet --report-file=reports/test.cloc.txt test

const Anthropic = require('@anthropic-ai/sdk');
console.log('APIUserAbortError:', Anthropic.APIUserAbortError.name);
console.log('AbortError exists?', !!Anthropic.APIUserAbortError);

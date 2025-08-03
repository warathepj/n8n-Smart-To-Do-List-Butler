const jsonString = $input.first().json.output.replace(/```json\n/, '').replace(/\n```$/, '');
const parsed = JSON.parse(jsonString);

return [{ 
  response: parsed.response, 
  id: parsed.id 
}];
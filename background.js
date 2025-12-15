const GITHUB_API = "https://api.github.com/graphql";

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === "FETCH_FILE") {
    fetchFile(msg).then(sendResponse);
    return true;
  }
});

async function fetchFile({ owner, repo, path }) {
  const { githubToken } = await chrome.storage.sync.get("githubToken");
  if (!githubToken) return { error: "NO_TOKEN" };

  const query = `
    query ($owner: String!, $repo: String!, $path: String!) {
      repository(owner: $owner, name: $repo) {
        object(expression: "HEAD:$path") {
          ... on Blob {
            text
          }
        }
      }
    }
  `;

  const res = await fetch(GITHUB_API, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${githubToken}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      query,
      variables: { owner, repo, path }
    })
  });

  const json = await res.json();
  return { content: json?.data?.repository?.object?.text || null };
}

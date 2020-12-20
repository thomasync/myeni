# MyENI

Download your books stored on your eni account, in EPUB or PDF.

## Usage...
  
### Get the info

 1. Log in to your ENI account.
 2. Go to the first page of your book (the url should look like this : http://www.eni-training.com/client_net/mediabook.aspx?idR=xxxxxxx)
 3. Right click on the page then inspect and go console. Or <kbd>Cmd</kbd> + <kbd>Option</kbd> + <kbd>J</kbd> / <kbd>Ctrl</kbd> + <kbd>Shift</kbd> + <kbd>J</kbd>
 4. Write `document.cookie`

### Use

1. `git clone https://github.com/absmoca/myeni` in terminal
2. `cd myeni && npm install`
3. `node myeni.js`
4. Then enter the information you previously retrieved with `document.cookie`
5. When you will be asked for the id of the book it will be the number in the url after *?IdR=**xxxxx***


## About the law...

In France, the copyright (called "Droit d'auteur") law has an exception called "private copy" ("Copie privée") :

You may create a copy of something if the goal is a private usage. Two origins are public diffusion and bought things.

So, you are not able to use this PoC to publish a book on a hidden network :)

*taken here: https://github.com/Nainterceptor/ENIDownloader*

## More information...
- The application is in French, but not very hard to understand there are only a few words
- If you download several books, you will probably have to retrieve the cookies each time because the site uses timestamps.
- Last time i used it and it worked: *21/12/2020*
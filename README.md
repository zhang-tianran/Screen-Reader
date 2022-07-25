# Screen-Reader

Screen reader is designed as an accessibility tool to help the visually impaired users. The users should be able to “listen” to the web pages, and have control over pause/resume, navigation between previous and next, and voice speed. 

## Functionality: 
- The screen reader would announce every element on the page in order, after the user clicks start or keyboard space. The script currently reading would be highlighted.
- The screen reader will have different modes for inputting text, browsing page normally, pausing, and exploring table
- The pause/resume of screen reader can be controlled by button clicking, or keyboard command “P”.
- The previous/next elements can be reached by button clicking, or keyboard command UpArrow/DownArrow.
- When encountering links, buttons, and input fields, the screen reader would give instructions to guide the user to interact with those elements.
    - Button: guides the user to click it using a keystroke.
    - Link: guides the user to navigate to the link using a keystroke.
    - Input box: pause reading and guides the user to enter data.
    - Table: navigation with keystrokes (arrow keys to move between cells) and getting table info (number of rows, number of columns)

## Set Up
1. Run “tsc” in the folder you are currently at to compile your code.
2. Add the script <code><script type="module" src="../screenreader.js"></script></code> in the <head> of the test HTML file.
3. Run “http-server” in the folder and open the HTML file in your browser. You should be able to use your screen reader!

---
This project was originally from CSCI 0320 class assignment. Built under collaboration with Brandon Gong and Chayathorn Kulthonchalanan.

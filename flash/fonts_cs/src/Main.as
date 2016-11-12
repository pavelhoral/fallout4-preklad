package {
    import flash.display.Sprite;
    import flash.text.Font;

    public class Main extends Sprite {

        public function Main() {
            Font.registerFont($BRODY);
            Font.registerFont($Controller_Buttons);
			Font.registerFont($Controller_Buttons_inverted);
            Font.registerFont($HandwrittenFont);
			Font.registerFont($MAIN_Font);
			Font.registerFont($MAIN_Font_Bold);
			Font.registerFont($Terminal_Font);
            Font.registerFont($ConsoleFont);
			Font.registerFont($DebugTextFont);
        }

    }

}
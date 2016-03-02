package {
    import flash.display.Sprite;
    import flash.text.Font;

    public class Main extends Sprite {

        public function Main() {
            Font.registerFont($BRODY);
            Font.registerFont($Terminal_Font);
            Font.registerFont($HandwrittenFont);
            Font.registerFont($DebugTextFont);
            Font.registerFont($ConsoleFont);
        }

    }

}
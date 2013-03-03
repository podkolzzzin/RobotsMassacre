using System;
using System.Collections.Generic;
using System.Drawing;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using Entity;
using Gui.Components;
using Level;
using Robots_Massacre_Client;
using Gfx;

namespace Gui.PopUps
{
    public class GameStatistics : GuiScreen
    {
        private List<Player> Players = new List<Player>();

        public GameStatistics(InputHandler Input) : base(Input, false, false, false, true) { }

        public override void Update()
        {
            Players.Clear();
            foreach (Player player in GameLevel.GetPlayers()) Players.Add(player);
            Players.Sort(delegate(Player A, Player B)
            {
                if (A == null || B == null) return 0;
                return A.Kills.CompareTo(B.Kills);
            });
        }

        public override void Render(GBitmap screen)
        {
            screen.Fill(175, 0, 0, 0);

            Modes mode = GameLevel.GetMode();
            int colWidth = 195;
            int nameColSx = screen.ScreenWidth / 2 - colWidth / 2;
            int killsColSx = nameColSx + 100;
            int deathsColSx = killsColSx + 50;
            int yo = 20;

            GFont.WriteXCenter(screen, "statistics", 2, yo);
            yo += 40;

            if (mode == Modes.Deathmatch)
            {
                RenderColTitle(screen, ref yo, nameColSx, killsColSx, deathsColSx);

                foreach (Player player in Players)
                {
                    RenderPlayer(screen, ref yo, player.Name, player.Kills, player.Deaths, nameColSx, killsColSx, deathsColSx);
                }
            }
            else
            {
                int xo = -(screen.ScreenWidth - colWidth) / 4 - 15;
                int col2Yo = yo;

                GFont.Write(screen, "team of blu", 1, nameColSx + xo, yo);
                yo += 20;

                RenderColTitle(screen, ref yo, nameColSx + xo, killsColSx + xo, deathsColSx + xo);

                foreach (Player player in Players)
                {
                    if (player.Team == Teams.Blu)
                    {
                        RenderPlayer(screen, ref yo, player.Name, player.Kills, player.Deaths, nameColSx + xo, killsColSx + xo, deathsColSx + xo);
                    }
                }

                xo = -1 * xo;
                yo = col2Yo;

                GFont.Write(screen, "team of red", 1, nameColSx + xo, yo);
                yo += 20;

                RenderColTitle(screen, ref yo, nameColSx + xo, killsColSx + xo, deathsColSx + xo);

                foreach (Player player in Players)
                {
                    if (player.Team == Teams.Red)
                    {
                        RenderPlayer(screen, ref yo, player.Name, player.Kills, player.Deaths, nameColSx + xo, killsColSx + xo, deathsColSx + xo);
                    }
                }
            }
        }

        private void RenderColTitle(GBitmap screen, ref int yo, int col1, int col2, int col3)
        {
            string nameSign = "name";
            GFont.Write(screen, nameSign, 1, col1, yo);
            string killsSign = "kills";
            GFont.Write(screen, killsSign, 1, col2, yo);
            string deathsSign = "deaths";
            GFont.Write(screen, deathsSign, 1, col3, yo);

            yo += 20;
        }

        private void RenderPlayer(GBitmap screen, ref int yo, string name, int kills, int deaths, int col1, int col2, int col3)
        {
            GFont.Write(screen, name, 1, col1, yo);
            GFont.Write(screen, "" + kills, 1, col2, yo);
            GFont.Write(screen, "" + deaths, 1, col3, yo);

            yo += 10;
        }
    }
}
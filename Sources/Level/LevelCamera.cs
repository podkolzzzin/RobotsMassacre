using Entity;
using Robots_Massacre_Client;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;

namespace Level
{
	public partial class GameLevel
	{
		public static bool InCameraFocus(GEntity Entity)
		{
			return Entity.X > XScroll - 30 && Entity.Y > YScroll - 30 &&
				Entity.X < XScroll + GameComponent.GetScreenWidth() + 30 && Entity.Y < YScroll + GameComponent.GetScreenHeight() + 30;
		}

		public static void RevealFog(int x, int y, int r)
		{
			Fog.SmoothEraseCircle(x, y, r);
		}

		public static void CenterCameraOnPlayer()
		{
			XScroll = (int)(CurrentPlayer.X - GameComponent.GetScreenWidth() / 2);
			YScroll = (int)(CurrentPlayer.Y - GameComponent.GetScreenHeight() / 2);
		}
	}
}
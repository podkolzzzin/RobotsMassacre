using Gfx;
using Level;
using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Entity
{
	public class Spawner : GEntity
	{
		public override int Type { get { return EntityType.SPAWNER; } }

		// It is used to only store the coordinates of a spawner
		public Spawner(float x, float y, Teams team)
			: base(x, y, 30, 30)
		{
			this.Team = team;
		}
        public override void Render(Gfx.GBitmap screen)
        {
            if (Team == Teams.Blu)
                screen.Blit(Art.GRAPHICS[4, 18], iX, iY);
            else
                screen.Blit(Art.GRAPHICS[5, 18], iX, iY);
            base.Render(screen);
        }
	}
}